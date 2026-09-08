// In scope: writing an R2 scan into the DB and keeping the sync's run record and progress
// Out of scope: classifying an unknown key, R2 wire detail, thumbnail generation, validating the launch envelope
import { randomUUID } from "node:crypto";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/contracts/media-jobs.js";
import { THUMBNAIL_PREFIX } from "@eskra-aws-playground/shared-domains/contracts/media-storage-layout.js";
import { Resource } from "sst/resource";
import { z } from "zod";
import { assertDeletableSize } from "@/features/media-sync/delete-guard.js";
import { scanMediaObjects } from "@/features/media-sync/media-object-scan.js";
import { buildMediaSyncPlan } from "@/features/media-sync/sync-plan.js";
import { enqueueMissingThumbnails } from "@/features/media-sync/thumbnail-enqueue.js";
import {
	type RegisteredMediaIds,
	resolveUnknownObjects,
} from "@/features/media-sync/unknown-object-resolution.js";
import { batchJobNames } from "@/handlers/batch/contracts/job-names.js";
import type { BatchResponse } from "@/handlers/batch/schema.js";

const logger = createBatchLogger(batchJobNames.mediaSync);

// How long a running record may sit before it counts as abandoned.
// It is set longer than Lambda's 15-minute timeout, so a job that is genuinely still running never gets flagged.
const STALE_RUN_THRESHOLD_MS = 20 * 60 * 1000;

// How many objects between progress write-backs; batched rather than per-object, so the write-back itself doesn't weigh the sync down.
const PROGRESS_INTERVAL = 1_000;

const mediaSyncEventSchema = z.object({
	/** Turns off the bulk-delete guard; set true on a manual invoke once the deletion has been reviewed. */
	allowBulkDelete: z.boolean().default(false),
});

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

	if (!(await mediaSyncRunRepository.start(runId, startedAt))) {
		// 3. Someone holds the slot. Inside the threshold it is genuinely running, so stand down.
		//    Past it the previous run died without recording its end: close it and claim once more.
		const running = await mediaSyncRunRepository.findRunning();
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
			await mediaSyncRunRepository.finish({
				id: running.id,
				scannedCount: running.scannedCount,
				insertedCount: running.insertedCount,
				updatedCount: running.updatedCount,
				deletedCount: running.deletedCount,
				finishedAt: startedAt,
				error: "終了を記録しないまま打ち切られました",
			});
		}

		if (!(await mediaSyncRunRepository.start(runId, startedAt))) {
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
		// 4. Walk R2 and match it against the DB's known list to build the sync plan.
		const scanned = await scanMediaObjects();
		const known = await mediaObjectRepository.findAllSummaries();

		// An empty R2 listing while the DB still holds rows means a token without permission or a wrong bucket, and errors
		if (scanned.length === 0 && known.length > 0) {
			throw new Error(
				"R2 の一覧が空でした。token の権限か MEDIA_BUCKET の指定を確認してください。",
			);
		}

		const plan = buildMediaSyncPlan({ scanned, known });

		progress.scannedCount = scanned.length;
		await mediaSyncRunRepository.updateProgress({ id: runId, ...progress });

		// 5. HeadObject only the unknown keys and sort them into new / moved / adopted.
		const registeredIds = {
			all: new Set(
				known.map((media) => {
					return media.id;
				}),
			),
			missing: new Set(plan.missingIds),
		} satisfies RegisteredMediaIds;
		let notifiedAt = 0;
		const resolved = await resolveUnknownObjects(
			{
				objects: plan.unknownObjects,
				registeredIds,
				syncedAt: startedAt,
			},
			async (partial) => {
				const resolvedCount = partial.insertCount + partial.relocationCount;

				if (resolvedCount - notifiedAt < PROGRESS_INTERVAL) {
					return;
				}

				notifiedAt = resolvedCount;
				// insertedCount and updatedCount written here are unsettled progress; finish overwrites them with the final values
				await mediaSyncRunRepository.updateProgress({
					id: runId,
					...progress,
					insertedCount: partial.insertCount,
					updatedCount: partial.relocationCount,
				});
			},
		);

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

		// 10. Enqueue the media with no thumbnail yet. This comes after the delete — enqueuing first would
		//    ask for thumbnails on media that is about to disappear.
		const enqueuedCount = await enqueueMissingThumbnails({
			queueUrl: Resource.MediaThumbnailQueue.url,
			job: mediaJobNames.mediaThumbnail,
			enqueuedAt: new Date(),
		});

		// 11. Close the run record and put the result in the log and the response.
		await mediaSyncRunRepository.finish({
			id: runId,
			...progress,
			finishedAt: new Date(),
		});

		logger.complete({
			runId,
			...progress,
			enqueuedCount,
			skippedCount: resolved.skippedCount,
		});

		return {
			ok: true,
			job: batchJobNames.mediaSync,
			details: {
				runId,
				...progress,
				enqueuedCount,
				skippedCount: resolved.skippedCount,
			},
		};
	} catch (error) {
		await mediaSyncRunRepository.finish({
			id: runId,
			...progress,
			finishedAt: new Date(),
			error: error instanceof Error ? error.message : String(error),
		});
		logger.failure(error, { runId, ...progress });

		throw error;
	}
};
