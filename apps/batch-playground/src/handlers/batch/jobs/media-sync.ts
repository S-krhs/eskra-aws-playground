// In scope: reconciling the R2 listing against the DB — classifying the scan, resolving unknown keys, writing the result, and keeping the run record
// Out of scope: R2 wire detail, DB queries, taking an outside object in, thumbnail generation, validating the launch envelope
import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import {
	PENDING_PREFIX,
	THUMBNAIL_PREFIX,
} from "@eskra-aws-playground/repositories/media/_shared/literals/storage-prefix.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type {
	InsertMediaObjectInput,
	RelocateMediaObjectInput,
} from "@eskra-aws-playground/repositories/media/media-object/types.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { StoredObjectSummary } from "@eskra-aws-playground/repositories/media/media-storage/types.js";
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import type { MediaAdoptMessage } from "@eskra-aws-playground/shared-domains/media/jobs/adopt-message.js";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/media/jobs/names.js";
import type { MediaThumbnailMessage } from "@eskra-aws-playground/shared-domains/media/jobs/thumbnail-message.js";
import { resolveContentType } from "@eskra-aws-playground/shared-domains/media/storage/content-type.js";
import { extractLogicalPath } from "@eskra-aws-playground/shared-domains/media/storage/object-key.js";
import { parseMediaObjectMetadata } from "@eskra-aws-playground/shared-domains/media/storage/object-metadata.js";
import { Resource } from "sst/resource";
import { z } from "zod";
import { batchJobNames } from "@/handlers/batch/contracts/job-names.js";
import type { BatchResponse } from "@/handlers/batch/schema.js";

const logger = createBatchLogger(batchJobNames.mediaSync);

// How long a running record may sit before it counts as abandoned.
// It is set longer than Lambda's 15-minute timeout, so a job that is genuinely still running never gets flagged.
const STALE_RUN_THRESHOLD_MS = 20 * 60 * 1000;

// How many objects between progress write-backs; batched rather than per-object, so the write-back itself doesn't weigh the sync down.
const PROGRESS_INTERVAL = 1_000;

// Awaiting HeadObject one at a time would never finish a first run of 100k objects, so they go out in batches
const HEAD_CONCURRENCY = 20;

// The most one sync asks for at a time, per queue.
// It keeps a large batch — a first run, say — from going out all at once; whatever is left over is
// still sitting in the listing, so the next sync picks it up
const ENQUEUE_LIMIT = 10_000;

// The largest fraction that may be deleted at once.
// It stops a listing gone nearly empty — a narrowed token or a wrong bucket name — from wiping out rows and their tag links with them.
const MAX_DELETE_RATIO = 0.1;

// Up to this many deletions pass regardless of the fraction.
// Without it, ordinary operation would stall on every handful of deletions.
const DELETE_GUARD_FLOOR = 50;

const mediaSyncEventSchema = z.object({
	/** Turns off the bulk-delete guard; set true on a manual invoke once the deletion has been reviewed. */
	allowBulkDelete: z.boolean().default(false),
});

/** Media whose content was replaced under an unchanged key. */
interface ChangedMediaObject {
	id: string;
	object: StoredObjectSummary;
}

/** One media object to have a thumbnail made for. */
interface ThumbnailRequest {
	mediaId: string;
	objectKey: string;
}

/**
 * Reconciles R2 against the DB. ListObjectsV2 returns no custom metadata, so a known key is matched
 * from the listing alone and only an unknown key gets a HeadObject.
 */
export const mediaSyncJob = async (event: unknown): Promise<BatchResponse> => {
	// 1. Validate the launch event and read whether the bulk-delete guard is waived.
	const { allowBulkDelete } = mediaSyncEventSchema.parse(event ?? {});

	// 2. Claim the run slot. Only one unfinished run may exist, so an invocation racing this one
	//    loses in the DB rather than in a read-then-write here.
	const startedAt = new Date();
	const runId = randomUUID();
	const progress = {
		scannedCount: 0,
		insertedCount: 0,
		updatedCount: 0,
		deletedCount: 0,
	};

	if (!(await mediaSyncRunRepository.insert(runId, startedAt))) {
		// 3. Someone holds the slot. Inside the threshold it is genuinely running, so stand down.
		//    Past it the previous run died without recording its end: close it and claim once more.
		const running = await mediaSyncRunRepository.findUnfinished();
		const isStale =
			running !== undefined &&
			startedAt.getTime() - running.startedAt.getTime() >=
				STALE_RUN_THRESHOLD_MS;

		if (running && !isStale) {
			logger.complete({ skipped: true, runningId: running.id });

			return {
				ok: true,
				job: batchJobNames.mediaSync,
				details: { skipped: true, runningId: running.id },
			};
		}

		if (running) {
			await mediaSyncRunRepository.updateFinished({
				id: running.id,
				scannedCount: running.scannedCount,
				insertedCount: running.insertedCount,
				updatedCount: running.updatedCount,
				deletedCount: running.deletedCount,
				finishedAt: startedAt,
				error: "終了を記録しないまま打ち切られました",
			});
		}

		if (!(await mediaSyncRunRepository.insert(runId, startedAt))) {
			logger.complete({ skipped: true });

			return {
				ok: true,
				job: batchJobNames.mediaSync,
				details: { skipped: true },
			};
		}
	}

	logger.start({ runId });

	try {
		// 4. Walk R2 and keep only the media. Thumbnails aren't media themselves and are excluded, as
		//    are extensions off the list — without that, text files and folder placeholders get taken
		//    in, and thumbnail generation fails on them forever and keeps backing up the DLQ.
		const scanned = (await mediaStorageRepository.listAll()).filter(
			(object) => {
				return (
					!object.key.startsWith(`${THUMBNAIL_PREFIX}/`) &&
					resolveContentType(extname(object.key)) !== undefined
				);
			},
		);
		const known = await mediaObjectRepository.findAllSummaries();

		// An empty R2 listing while the DB still holds rows means a token without permission or a wrong bucket, and errors
		if (scanned.length === 0 && known.length > 0) {
			throw new Error(
				"R2 の一覧が空でした。token の権限か MEDIA_BUCKET の指定を確認してください。",
			);
		}

		// 5. Match the scan against the registered keys. This splits on key equality alone — a decision
		//    needing metadata waits for step 6, because ListObjectsV2 returns no metadata.
		const knownByKey = new Map(
			known.map((media) => {
				return [media.objectKey, media];
			}),
		);
		const unchangedIds: string[] = [];
		const changedObjects: ChangedMediaObject[] = [];
		const unknownObjects: StoredObjectSummary[] = [];

		for (const object of scanned) {
			const media = knownByKey.get(object.key);

			if (!media) {
				unknownObjects.push(object);
				continue;
			}

			// An overwrite under the same key changes only the etag
			if (media.etag === object.etag) {
				unchangedIds.push(media.id);
				continue;
			}

			changedObjects.push({ id: media.id, object });
		}

		const foundIds = new Set([
			...unchangedIds,
			...changedObjects.map((changed) => {
				return changed.id;
			}),
		]);
		const missingIds = new Set(
			known
				.filter((media) => {
					return !foundIds.has(media.id);
				})
				.map((media) => {
					return media.id;
				}),
		);
		const knownIds = new Set(
			known.map((media) => {
				return media.id;
			}),
		);

		progress.scannedCount = scanned.length;
		await mediaSyncRunRepository.updateCounts({ id: runId, ...progress });

		// 6. HeadObject only the unknown keys and sort them into moved / copied / new / to be taken in,
		//    writing the running totals back every so often since a first run takes minutes to get through.
		const inserts: InsertMediaObjectInput[] = [];
		const relocations: RelocateMediaObjectInput[] = [];
		const adoptionKeys: string[] = [];
		let skippedCount = 0;
		let notifiedAt = 0;

		for (
			let offset = 0;
			offset < unknownObjects.length;
			offset += HEAD_CONCURRENCY
		) {
			const chunk = unknownObjects.slice(offset, offset + HEAD_CONCURRENCY);
			const heads = await Promise.all(
				chunk.map(async (object) => {
					// An object gone since the listing must not fail the whole sync
					return {
						object,
						head: await mediaStorageRepository.headIfExists(object.key),
					};
				}),
			);

			for (const { object, head } of heads) {
				if (!head) {
					continue;
				}

				const metadata = parseMediaObjectMetadata(head.metadata);

				// Nothing this app put there. Taking it in rewrites R2 per object, so it goes to its own
				// worker rather than being done inline here
				if (!metadata) {
					adoptionKeys.push(object.key);
					continue;
				}

				// A copy carries the original's metadata along, so the same media-id can sit on two keys.
				// A move is only recorded once the original key is confirmed gone — skip that check and
				// objectKey flips between the two on every run
				if (missingIds.has(metadata.mediaId)) {
					relocations.push({
						id: metadata.mediaId,
						objectKey: object.key,
						logicalPath: extractLogicalPath(object.key),
						byteSize: object.byteSize,
						etag: object.etag,
						syncedAt: startedAt,
					});
					continue;
				}

				// The same media-id while the original key is still there means it was copied, and
				// there's no telling which one to keep
				if (knownIds.has(metadata.mediaId)) {
					skippedCount += 1;
					continue;
				}

				inserts.push({
					id: metadata.mediaId,
					objectKey: object.key,
					logicalPath: extractLogicalPath(object.key),
					fileName: metadata.originalName || basename(object.key),
					contentType: head.contentType,
					byteSize: object.byteSize,
					etag: object.etag,
					uploadedAt: object.lastModified,
					syncedAt: startedAt,
				});
			}

			const resolvedCount =
				inserts.length + relocations.length + adoptionKeys.length;

			if (resolvedCount - notifiedAt >= PROGRESS_INTERVAL) {
				notifiedAt = resolvedCount;
				// These two are unsettled progress; step 12 overwrites them with the final values
				await mediaSyncRunRepository.updateCounts({
					id: runId,
					...progress,
					insertedCount: inserts.length,
					updatedCount: relocations.length,
				});
			}
		}

		// 7. Take anything already moved out of the delete set.
		//    A move shows up as its old key going missing, so it is treated as a move, not a delete.
		const relocatedIds = new Set(
			relocations.map((relocation) => {
				return relocation.id;
			}),
		);
		const deletableIds = [...missingIds].filter((id) => {
			return !relocatedIds.has(id);
		});

		// 8. Write the inserts and updates to the DB first, so a stop at the delete guard doesn't lose
		//    what was newly taken in or updated.
		progress.insertedCount = await mediaObjectRepository.insertMany(inserts);
		progress.updatedCount =
			(await mediaObjectRepository.relocateMany(relocations)) +
			(await mediaObjectRepository.refreshMany(
				changedObjects.map((changed) => {
					return {
						id: changed.id,
						byteSize: changed.object.byteSize,
						etag: changed.object.etag,
						uploadedAt: changed.object.lastModified,
						syncedAt: startedAt,
					};
				}),
			));
		await mediaObjectRepository.touchMany(unchangedIds, startedAt);

		// 9. Run the bulk-delete guard, waived when allowBulkDelete is true. Deleting a row leaves the R2
		//    object but takes its tag links with it, and tags added by hand can't be restored — so an
		//    abnormal number of deletions abandons the delete rather than going through with it.
		if (
			!allowBulkDelete &&
			deletableIds.length > DELETE_GUARD_FLOOR &&
			deletableIds.length > known.length * MAX_DELETE_RATIO
		) {
			throw new Error(
				`登録済み ${known.length} 件のうち ${deletableIds.length} 件が R2 に見つかりません。` +
					"token の権限か MEDIA_BUCKET の指定を確認してください。",
			);
		}

		// 10. Delete the thumbnails from R2, then the DB rows. Once a row is gone its thumbnail can't be
		//     found from a scan, so the thumbnail always goes first. A thumbnail key derives from the UUID,
		//     so even a row with an empty thumbnailKey gets cleaned up.
		for (const id of deletableIds) {
			await mediaStorageRepository.delete(`${THUMBNAIL_PREFIX}/${id}.webp`);
		}

		progress.deletedCount =
			await mediaObjectRepository.deleteByIds(deletableIds);

		// 11. Hand the per-object work to its workers. Thumbnails go to whatever is still waiting under
		//     the pending prefix plus anything replaced under an unchanged key; adoptions go to the keys
		//     that carried no metadata. Both sets come out of the listing, so media about to be deleted
		//     can never appear in them and this no longer has to run after the delete.
		const mediaIdByKey = new Map<string, string>([
			...known.map((media): [string, string] => {
				return [media.objectKey, media.id];
			}),
			...inserts.map((insert): [string, string] => {
				return [insert.objectKey, insert.id];
			}),
			...relocations.map((relocation): [string, string] => {
				return [relocation.objectKey, relocation.id];
			}),
		]);
		const thumbnailRequests = [
			...scanned
				.filter((object) => {
					return object.key.startsWith(`${PENDING_PREFIX}/`);
				})
				.flatMap((object): ThumbnailRequest[] => {
					const mediaId = mediaIdByKey.get(object.key);

					return mediaId ? [{ mediaId, objectKey: object.key }] : [];
				}),
			...changedObjects.map((changed): ThumbnailRequest => {
				return { mediaId: changed.id, objectKey: changed.object.key };
			}),
		].slice(0, ENQUEUE_LIMIT);

		if (thumbnailRequests.length > 0) {
			const sender = new SqsMessageSender(Resource.MediaThumbnailQueue.url);
			await sender.sendMessages(
				thumbnailRequests.map((request) => {
					return {
						id: request.mediaId,
						body: {
							job: mediaJobNames.mediaThumbnail,
							mediaId: request.mediaId,
							objectKey: request.objectKey,
						} satisfies MediaThumbnailMessage,
					};
				}),
			);
		}

		const adoptions = adoptionKeys.slice(0, ENQUEUE_LIMIT);

		if (adoptions.length > 0) {
			const sender = new SqsMessageSender(Resource.MediaAdoptQueue.url);
			await sender.sendMessages(
				adoptions.map((objectKey) => {
					return {
						// SQS only takes alphanumerics, hyphens and underscores here, and these objects
						// have no id of their own yet — the batch entry id is only used to report a failure
						id: randomUUID(),
						body: {
							job: mediaJobNames.mediaAdopt,
							objectKey,
						} satisfies MediaAdoptMessage,
					};
				}),
			);
		}

		// 12. Close the run record and put the result in the log and the response.
		await mediaSyncRunRepository.updateFinished({
			id: runId,
			...progress,
			finishedAt: new Date(),
		});

		const details = {
			runId,
			...progress,
			enqueuedThumbnailCount: thumbnailRequests.length,
			enqueuedAdoptionCount: adoptions.length,
			skippedCount,
		};
		logger.complete(details);

		return { ok: true, job: batchJobNames.mediaSync, details };
	} catch (error) {
		await mediaSyncRunRepository.updateFinished({
			id: runId,
			...progress,
			finishedAt: new Date(),
			error: error instanceof Error ? error.message : String(error),
		});
		logger.failure(error, { runId, ...progress });

		throw error;
	}
};
