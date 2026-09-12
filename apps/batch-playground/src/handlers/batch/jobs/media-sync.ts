// In scope: reconciling the R2 listing against the DB — classifying the scan, resolving unknown keys, writing the result, and keeping the run record
// Out of scope: R2 wire detail, DB queries, taking an outside object in, thumbnail generation, the shape of the launch event
import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
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
import { parseMediaObjectMetadata } from "@eskra-aws-playground/shared-domains/media/storage/object-metadata.js";
import { Resource } from "sst/resource";
import { batchJobNames } from "@/handlers/batch/contracts/job-names.js";
import {
	type BatchResponse,
	mediaSyncEventSchema,
} from "@/handlers/batch/schema.js";

const logger = createBatchLogger(batchJobNames.mediaSync);

// How long a running record may sit before it counts as abandoned.
// It is set longer than Lambda's 15-minute timeout, so a job that is genuinely still running never gets flagged.
const STALE_RUN_THRESHOLD_MS = 20 * 60 * 1000;

// How many resolved objects pile up before they are written to the DB.
// Writing per object would weigh the sync down; holding them all to the end means a run cut off by the
// 15-minute timeout leaves nothing behind and starts over from the same place every time.
const WRITE_BACK_INTERVAL = 1_000;

// Awaiting one object at a time would never finish a first run of 100k, so HeadObject and DeleteObject
// both go out in batches this wide
const STORAGE_CONCURRENCY = 20;

// The most one sync asks for at a time, per queue.
// It keeps a large batch — a first run, say — from going out all at once; whatever is left over still
// has no thumbnail recorded against it, so the next sync asks again
const ENQUEUE_LIMIT = 10_000;

// The largest fraction that may be deleted at once.
// It stops a listing gone nearly empty — a narrowed token or a wrong bucket name — from wiping out rows and their tag links with them.
const MAX_DELETE_RATIO = 0.1;

// Up to this many deletions pass regardless of the fraction.
// Without it, ordinary operation would stall on every handful of deletions.
const DELETE_GUARD_FLOOR = 50;

/** Media whose content was replaced under an unchanged key. */
interface ChangedMediaObject {
	id: string;
	object: StoredObjectSummary;
}

/**
 * Reconciles R2 against the DB. ListObjectsV2 returns no custom metadata, so a known key is matched
 * from the listing alone and only an unknown key gets a HeadObject.
 */
export const mediaSyncJob = async (event: unknown): Promise<BatchResponse> => {
	// 1. Read whether the bulk-delete guard is waived out of the launch event.
	const parsedEvent = mediaSyncEventSchema.safeParse(event ?? {});

	if (!parsedEvent.success) {
		throw new Error("allowBulkDelete は真偽値で指定してください。");
	}

	const { allowBulkDelete } = parsedEvent.data;

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
		//    The trash area stays in: what sits there is still a registered row, so leaving it out
		//    would read as the media having disappeared from R2 and delete those rows for real.
		const scanned = (await mediaStorageRepository.listAll()).filter(
			(object) => {
				return (
					object.area !== "thumbnail" &&
					resolveContentType(extname(object.key)) !== undefined
				);
			},
		);
		const known = await mediaObjectRepository.findAllSummaries();

		// An empty R2 listing while the DB still holds rows means a token without permission or a wrong
		// bucket. It is the extreme of the delete guard below and the same waiver lifts it, so emptying
		// the bucket on purpose isn't a dead end
		if (!allowBulkDelete && scanned.length === 0 && known.length > 0) {
			throw new Error(
				"R2 の一覧が空でした。token の権限か MEDIA_BUCKET の指定を確認してください。",
			);
		}

		// 5. Match the scan against the registered keys. This splits on key equality alone — a decision
		//    needing metadata waits for step 7, because ListObjectsV2 returns no metadata.
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

		// 6. Write what the listing alone settles. refreshMany clears the thumbnail of replaced content,
		//    and step 12 reads that back as the request to build it again.
		progress.updatedCount += await mediaObjectRepository.refreshMany(
			changedObjects.map((changed) => {
				return {
					id: changed.id,
					byteSize: changed.object.byteSize,
					etag: changed.object.etag,
					uploadedAt: changed.object.lastModified,
					syncedAt: startedAt,
				};
			}),
		);
		await mediaObjectRepository.touchMany(unchangedIds, startedAt);
		await mediaSyncRunRepository.updateCounts({ id: runId, ...progress });

		// 7. HeadObject only the unknown keys and sort them into moved / copied / new / to be taken in.
		//    A first run takes minutes to get through, so what has been resolved goes to the DB as it
		//    piles up rather than at the end — a run cut off by the timeout still leaves that behind.
		const inserts: InsertMediaObjectInput[] = [];
		const relocations: RelocateMediaObjectInput[] = [];
		const relocatedIds = new Set<string>();
		const adoptionKeys: string[] = [];
		let skippedCount = 0;
		let headFailureCount = 0;
		let headFailure: unknown;

		// Takes what has piled up rather than reading it in place, so nothing that arrives while the
		// write is in flight is dropped on the way out
		const writeBackResolved = async (): Promise<void> => {
			const resolvedInserts = inserts.splice(0);
			const resolvedRelocations = relocations.splice(0);

			progress.insertedCount +=
				await mediaObjectRepository.insertMany(resolvedInserts);
			progress.updatedCount +=
				await mediaObjectRepository.relocateMany(resolvedRelocations);
			await mediaSyncRunRepository.updateCounts({ id: runId, ...progress });
		};

		for (
			let offset = 0;
			offset < unknownObjects.length;
			offset += STORAGE_CONCURRENCY
		) {
			const chunk = unknownObjects.slice(offset, offset + STORAGE_CONCURRENCY);
			const heads = await Promise.allSettled(
				chunk.map(async (object) => {
					return {
						object,
						head: await mediaStorageRepository.headIfExists(object.key),
					};
				}),
			);

			for (const settled of heads) {
				// A throttle or a 5xx on one key must not throw away the rest of the batch; the key stays
				// unknown and the next run reads it again
				if (settled.status === "rejected") {
					headFailureCount += 1;
					headFailure ??= settled.reason;
					continue;
				}

				const { object, head } = settled.value;

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
				// objectKey flips between the two on every run. Only the first key found takes the move:
				// a second would put the same id on the queue twice, and SQS rejects a whole batch whose
				// entry ids repeat
				if (
					missingIds.has(metadata.mediaId) &&
					!relocatedIds.has(metadata.mediaId)
				) {
					relocatedIds.add(metadata.mediaId);
					relocations.push({
						id: metadata.mediaId,
						objectKey: object.key,
						logicalPath: object.logicalPath,
						byteSize: object.byteSize,
						etag: object.etag,
						syncedAt: startedAt,
					});
					continue;
				}

				// The same media-id on a key already accounted for means it was copied, and there's no
				// telling which one to keep
				if (knownIds.has(metadata.mediaId)) {
					skippedCount += 1;
					continue;
				}

				inserts.push({
					id: metadata.mediaId,
					objectKey: object.key,
					logicalPath: object.logicalPath,
					fileName: metadata.originalName || basename(object.key),
					contentType: head.contentType,
					byteSize: object.byteSize,
					etag: object.etag,
					uploadedAt: object.lastModified,
					syncedAt: startedAt,
				});
			}

			if (inserts.length + relocations.length >= WRITE_BACK_INTERVAL) {
				await writeBackResolved();
			}
		}

		await writeBackResolved();

		if (headFailureCount > 0) {
			// Logged once rather than per object, so a throttled run doesn't bury the rest of the log
			logger.failure(headFailure, { runId, headFailureCount });
		}

		// 8. Take anything already moved out of the delete set. A move shows up as its old key going
		//    missing, so it is treated as a move, not a delete. An unread key may well be where one of
		//    them moved to, so a failed HeadObject holds the whole delete back to the next run.
		const deletableIds =
			headFailureCount > 0
				? []
				: [...missingIds].filter((id) => {
						return !relocatedIds.has(id);
					});

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
		for (
			let offset = 0;
			offset < deletableIds.length;
			offset += STORAGE_CONCURRENCY
		) {
			await Promise.all(
				deletableIds
					.slice(offset, offset + STORAGE_CONCURRENCY)
					.map(async (id) => {
						await mediaStorageRepository.deleteThumbnail(id);
					}),
			);
		}

		progress.deletedCount =
			await mediaObjectRepository.deleteByIds(deletableIds);

		// 11. Ask for the thumbnail of every row that has none recorded. Reading the request back out of
		//     the DB rather than out of what this run resolved is what makes the sweep self-healing: a
		//     request cut off by the limit, a send that failed, and a message that died in the DLQ all
		//     leave the column null, so the next run asks again. Only keys the scan still holds are asked
		//     for, and the failed area is left out — generation gave up on those, and re-asking would
		//     loop forever (apps/batch-playground/README.md has how to bring one back).
		const scannedKeys = new Set(
			scanned.map((object) => {
				return object.key;
			}),
		);
		const thumbnailTargets = (
			await mediaObjectRepository.findAllWithoutThumbnail()
		)
			.filter((media) => {
				return (
					scannedKeys.has(media.objectKey) &&
					mediaStorageRepository.resolveArea(media.objectKey) !== "failed"
				);
			})
			.slice(0, ENQUEUE_LIMIT);

		if (thumbnailTargets.length > 0) {
			const sender = new SqsMessageSender(Resource.MediaThumbnailQueue.url);
			// A row appears once, so the ids these entries carry can't repeat inside a batch
			await sender.sendMessages(
				thumbnailTargets.map((media) => {
					return {
						id: media.id,
						body: {
							job: mediaJobNames.mediaThumbnail,
							mediaId: media.id,
							objectKey: media.objectKey,
						} satisfies MediaThumbnailMessage,
					};
				}),
			);
		}

		// 12. Hand the keys that carried no metadata to the adoption worker.
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

		// 13. Close the run record and put the result in the log and the response.
		await mediaSyncRunRepository.updateFinished({
			id: runId,
			...progress,
			finishedAt: new Date(),
		});

		const details = {
			runId,
			...progress,
			enqueuedThumbnailCount: thumbnailTargets.length,
			enqueuedAdoptionCount: adoptions.length,
			skippedCount,
			headFailureCount,
		};
		logger.complete(details);

		return { ok: true, job: batchJobNames.mediaSync, details };
	} catch (error) {
		// Releasing the slot is best effort: a DB that is down here is usually what failed above, and
		// letting this throw would replace the cause with a second connection error
		try {
			await mediaSyncRunRepository.updateFinished({
				id: runId,
				...progress,
				finishedAt: new Date(),
				error: error instanceof Error ? error.message : String(error),
			});
		} catch (finishError) {
			logger.failure(finishError, { runId });
		}

		logger.failure(error, { runId, ...progress });

		throw error;
	}
};
