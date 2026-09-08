// In scope: reconciling the R2 listing against the DB — classifying the scan, resolving unknown keys, writing the result, and keeping the run record
// Out of scope: R2 wire detail, DB queries, thumbnail generation, validating the launch envelope
import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import {
	INBOX_PREFIX,
	PENDING_PREFIX,
	THUMBNAIL_PREFIX,
} from "@eskra-aws-playground/repositories/media/_shared/literals/storage-prefix.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type {
	InsertMediaObjectInput,
	MediaObjectSummary,
	RelocateMediaObjectInput,
} from "@eskra-aws-playground/repositories/media/media-object/types.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { StoredObjectSummary } from "@eskra-aws-playground/repositories/media/media-storage/types.js";
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import {
	type MediaThumbnailMessage,
	mediaJobNames,
} from "@eskra-aws-playground/shared-domains/media/jobs/schema.js";
import { resolveContentType } from "@eskra-aws-playground/shared-domains/media/storage/content-type.js";
import {
	buildMediaObjectKey,
	extractLogicalPath,
} from "@eskra-aws-playground/shared-domains/media/storage/object-key.js";
import {
	buildMediaObjectMetadata,
	parseMediaObjectMetadata,
} from "@eskra-aws-playground/shared-domains/media/storage/object-metadata.js";
import type { MediaObjectMetadata } from "@eskra-aws-playground/shared-domains/media/storage/schema.js";
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

// Files sharing a modified time are rare; going past this points at a skew in what is being taken in
const MAX_KEY_SEQUENCE = 100;

// The most one sync asks for at a time.
// It keeps a large batch — a first run, say — from going out all at once; whatever is left over is
// still sitting under the pending prefix, so the next sync picks it up
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

/** How the scan splits against the registered keys, before any metadata has been read. */
interface MediaSyncPlan {
	/** Registered ids matching on both key and etag; only their last-seen time is updated. */
	unchangedIds: string[];
	/** Same key, different etag; dimensions and thumbnail get rebuilt. */
	changedObjects: ChangedMediaObject[];
	/** Keys absent from the DB; reading their metadata decides new versus moved. */
	unknownObjects: StoredObjectSummary[];
	/** Ids in the DB but not in R2; deleted unless they turn out to be a move. */
	missingIds: string[];
}

/** The registered ids an unknown key is judged against; `missing` is a subset of `all`. */
export interface RegisteredMediaIds {
	all: ReadonlySet<string>;
	/** Registered ids that the storage listing didn't turn up. */
	missing: ReadonlySet<string>;
}

export type UnknownObjectDecision =
	| { kind: "relocate"; mediaId: string }
	| { kind: "insert"; mediaId: string; originalName: string }
	| { kind: "duplicate"; mediaId: string }
	| { kind: "adopt" };

/** The rows resolving the unknown keys produced, plus how many couldn't be handled. */
interface ResolvedUnknownObjects {
	inserts: InsertMediaObjectInput[];
	relocations: RelocateMediaObjectInput[];
	skippedCount: number;
}

/** One media object to have a thumbnail made for. */
interface ThumbnailRequest {
	mediaId: string;
	objectKey: string;
}

/**
 * Decides whether a key is media to take in. Thumbnails aren't media themselves and are excluded,
 * as are extensions off the list. Without that, text files and folder placeholders get taken in,
 * and thumbnail generation fails on them forever and keeps backing up the DLQ.
 */
export const isMediaKey = (key: string): boolean => {
	if (key.startsWith(`${THUMBNAIL_PREFIX}/`)) {
		return false;
	}

	return resolveContentType(extname(key)) !== undefined;
};

/**
 * Matches the scan against the registered keys. It splits on key equality alone and leaves any
 * decision needing metadata to the caller. ListObjectsV2 returns no metadata, so nothing calls
 * HeadObject at this stage.
 */
export const buildMediaSyncPlan = (input: {
	scanned: StoredObjectSummary[];
	known: MediaObjectSummary[];
}): MediaSyncPlan => {
	const knownByKey = new Map(
		input.known.map((media) => {
			return [media.objectKey, media];
		}),
	);

	const unchangedIds: string[] = [];
	const changedObjects: ChangedMediaObject[] = [];
	const unknownObjects: StoredObjectSummary[] = [];

	for (const object of input.scanned) {
		const known = knownByKey.get(object.key);

		if (!known) {
			unknownObjects.push(object);
			continue;
		}

		// An overwrite under the same key changes only the etag
		if (known.etag === object.etag) {
			unchangedIds.push(known.id);
			continue;
		}

		changedObjects.push({ id: known.id, object });
	}

	const foundIds = new Set([
		...unchangedIds,
		...changedObjects.map((changed) => {
			return changed.id;
		}),
	]);
	const missingIds = input.known
		.filter((media) => {
			return !foundIds.has(media.id);
		})
		.map((media) => {
			return media.id;
		});

	return { unchangedIds, changedObjects, unknownObjects, missingIds };
};

/**
 * Decides what to do with an unknown key from its metadata and the registered ids.
 * A copy carries the original's metadata along, so the same media-id can sit on two keys — a relocate
 * is only called once the original key is confirmed gone. Skip that check and objectKey flips between
 * the two on every run.
 */
export const decideUnknownObject = (
	metadata: MediaObjectMetadata | undefined,
	registeredIds: RegisteredMediaIds,
): UnknownObjectDecision => {
	if (!metadata) {
		return { kind: "adopt" };
	}

	if (registeredIds.missing.has(metadata.mediaId)) {
		return { kind: "relocate", mediaId: metadata.mediaId };
	}

	// The same media-id appearing while the original key is still there means it was copied
	if (registeredIds.all.has(metadata.mediaId)) {
		return { kind: "duplicate", mediaId: metadata.mediaId };
	}

	return {
		kind: "insert",
		mediaId: metadata.mediaId,
		originalName: metadata.originalName,
	};
};

/**
 * Throws on an abnormal number of deletions, so the caller abandons the delete.
 * Deleting a row leaves the R2 object but takes its tag links with it, and tags added by hand can't
 * be restored — so every delete goes through this first.
 */
export const assertDeletableSize = (
	deletableCount: number,
	knownCount: number,
): void => {
	if (deletableCount <= DELETE_GUARD_FLOOR) {
		return;
	}

	if (deletableCount <= knownCount * MAX_DELETE_RATIO) {
		return;
	}

	throw new Error(
		`登録済み ${knownCount} 件のうち ${deletableCount} 件が R2 に見つかりません。` +
			"token の権限か MEDIA_BUCKET の指定を確認してください。",
	);
};

const resolveAvailableInboxKey = async (
	modifiedAt: Date,
	extension: string,
): Promise<string> => {
	for (let sequence = 0; sequence <= MAX_KEY_SEQUENCE; sequence += 1) {
		const key = buildMediaObjectKey({
			logicalPath: INBOX_PREFIX,
			modifiedAt,
			extension,
			sequence: sequence === 0 ? undefined : sequence + 1,
		});

		if (!(await mediaStorageRepository.headIfExists(key))) {
			return key;
		}
	}

	throw new Error(
		`同じ更新日時の key が ${MAX_KEY_SEQUENCE} 件を超えて埋まっています`,
	);
};

/**
 * Assigns a UUID to an object placed from outside this app and moves it to an _inbox key.
 * A Copy attaches the metadata, then a Delete removes the original; if the Delete fails, the copy is
 * deleted to undo it. Leaving the original in place means the next sync takes it in again, producing
 * two UUIDs and two rows for the same content.
 */
const adoptObject = async (input: {
	object: StoredObjectSummary;
	contentType: string;
	syncedAt: Date;
}): Promise<InsertMediaObjectInput> => {
	const mediaId = randomUUID();
	const originalName = basename(input.object.key);
	const destinationKey = await resolveAvailableInboxKey(
		input.object.lastModified,
		extname(input.object.key),
	);

	await mediaStorageRepository.copy({
		sourceKey: input.object.key,
		destinationKey,
		metadata: buildMediaObjectMetadata({ mediaId, originalName }),
		contentType: input.contentType,
	});

	// A copy's etag doesn't always match the original's (when the original went up as multipart).
	// Registering the source's etag would make the next sync read it as a replacement and rebuild the thumbnail
	const copied = await mediaStorageRepository.head(destinationKey);

	try {
		await mediaStorageRepository.delete(input.object.key);
	} catch (error) {
		await mediaStorageRepository.delete(destinationKey);

		throw error;
	}

	return {
		id: mediaId,
		objectKey: destinationKey,
		logicalPath: extractLogicalPath(destinationKey),
		fileName: originalName,
		contentType: input.contentType,
		byteSize: copied.byteSize,
		etag: copied.etag,
		uploadedAt: input.object.lastModified,
		syncedAt: input.syncedAt,
	};
};

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
		// 4. Walk R2, keep only the media, and match it against the DB's known list.
		const scanned = (await mediaStorageRepository.listAll()).filter(
			(object) => {
				return isMediaKey(object.key);
			},
		);
		const known = await mediaObjectRepository.findAllSummaries();

		// An empty R2 listing while the DB still holds rows means a token without permission or a wrong bucket, and errors
		if (scanned.length === 0 && known.length > 0) {
			throw new Error(
				"R2 の一覧が空でした。token の権限か MEDIA_BUCKET の指定を確認してください。",
			);
		}

		const plan = buildMediaSyncPlan({ scanned, known });

		progress.scannedCount = scanned.length;
		await mediaSyncRunRepository.updateCounts({ id: runId, ...progress });

		// 5. HeadObject only the unknown keys and sort them into new / moved / adopted, writing the
		//    running totals back every so often since a first run takes minutes to get through.
		const registeredIds: RegisteredMediaIds = {
			all: new Set(
				known.map((media) => {
					return media.id;
				}),
			),
			missing: new Set(plan.missingIds),
		};
		const resolved: ResolvedUnknownObjects = {
			inserts: [],
			relocations: [],
			skippedCount: 0,
		};
		let notifiedAt = 0;

		for (
			let offset = 0;
			offset < plan.unknownObjects.length;
			offset += HEAD_CONCURRENCY
		) {
			const chunk = plan.unknownObjects.slice(
				offset,
				offset + HEAD_CONCURRENCY,
			);
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

				const decision = decideUnknownObject(
					parseMediaObjectMetadata(head.metadata),
					registeredIds,
				);

				if (decision.kind === "relocate") {
					resolved.relocations.push({
						id: decision.mediaId,
						objectKey: object.key,
						logicalPath: extractLogicalPath(object.key),
						byteSize: object.byteSize,
						etag: object.etag,
						syncedAt: startedAt,
					});
					continue;
				}

				// A copy still has its original alive, so there's no telling which one to keep
				if (decision.kind === "duplicate") {
					resolved.skippedCount += 1;
					continue;
				}

				if (decision.kind === "insert") {
					resolved.inserts.push({
						id: decision.mediaId,
						objectKey: object.key,
						logicalPath: extractLogicalPath(object.key),
						fileName: decision.originalName || basename(object.key),
						contentType: head.contentType,
						byteSize: object.byteSize,
						etag: object.etag,
						uploadedAt: object.lastModified,
						syncedAt: startedAt,
					});
					continue;
				}

				// Adopting rewrites R2, so it runs one at a time rather than in parallel.
				// One failure doesn't fail the whole sync; it carries over to the next run
				try {
					resolved.inserts.push(
						await adoptObject({
							object,
							contentType: head.contentType,
							syncedAt: startedAt,
						}),
					);
				} catch {
					resolved.skippedCount += 1;
				}
			}

			const resolvedCount =
				resolved.inserts.length + resolved.relocations.length;

			if (resolvedCount - notifiedAt >= PROGRESS_INTERVAL) {
				notifiedAt = resolvedCount;
				// These two are unsettled progress; step 11 overwrites them with the final values
				await mediaSyncRunRepository.updateCounts({
					id: runId,
					...progress,
					insertedCount: resolved.inserts.length,
					updatedCount: resolved.relocations.length,
				});
			}
		}

		// 6. Take anything already moved out of the delete set.
		//    A move shows up as its old key going missing, so it is treated as a move, not a delete.
		const relocatedIds = new Set(
			resolved.relocations.map((relocation) => {
				return relocation.id;
			}),
		);
		const deletableIds = plan.missingIds.filter((id) => {
			return !relocatedIds.has(id);
		});

		// 7. Write the inserts and updates to the DB first, so a stop at the delete guard doesn't lose
		//    what was newly taken in or updated.
		progress.insertedCount = await mediaObjectRepository.insertMany(
			resolved.inserts,
		);
		progress.updatedCount =
			(await mediaObjectRepository.relocateMany(resolved.relocations)) +
			(await mediaObjectRepository.refreshMany(
				plan.changedObjects.map((changed) => {
					return {
						id: changed.id,
						byteSize: changed.object.byteSize,
						etag: changed.object.etag,
						uploadedAt: changed.object.lastModified,
						syncedAt: startedAt,
					};
				}),
			));
		await mediaObjectRepository.touchMany(plan.unchangedIds, startedAt);

		// 8. Run the bulk-delete guard, skipped when allowBulkDelete is true.
		if (!allowBulkDelete) {
			assertDeletableSize(deletableIds.length, known.length);
		}

		// 9. Delete the thumbnails from R2, then the DB rows. Once a row is gone its thumbnail can't be
		//    found from a scan, so the thumbnail always goes first. A thumbnail key derives from the UUID,
		//    so even a row with an empty thumbnailKey gets cleaned up.
		for (const id of deletableIds) {
			await mediaStorageRepository.delete(`${THUMBNAIL_PREFIX}/${id}.webp`);
		}

		progress.deletedCount =
			await mediaObjectRepository.deleteByIds(deletableIds);

		// 10. Request thumbnails for whatever is still waiting: everything sitting under the pending
		//     prefix, plus anything whose content was replaced under an unchanged key. Both sets come
		//     out of the listing, so media about to be deleted can never appear in them and this no
		//     longer has to run after the delete.
		const mediaIdByKey = new Map<string, string>([
			...known.map((media): [string, string] => {
				return [media.objectKey, media.id];
			}),
			...resolved.inserts.map((insert): [string, string] => {
				return [insert.objectKey, insert.id];
			}),
			...resolved.relocations.map((relocation): [string, string] => {
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
			...plan.changedObjects.map((changed): ThumbnailRequest => {
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

		// 11. Close the run record and put the result in the log and the response.
		await mediaSyncRunRepository.updateFinished({
			id: runId,
			...progress,
			finishedAt: new Date(),
		});

		const details = {
			runId,
			...progress,
			enqueuedCount: thumbnailRequests.length,
			skippedCount: resolved.skippedCount,
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
