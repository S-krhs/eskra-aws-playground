// In scope: R2 の走査結果を DB へ反映し、同期の実行記録と進捗を残す
// Out of scope: 未知 key の判定、R2 の wire 解釈、サムネイル生成、Lambda イベントの検証
import { randomUUID } from "node:crypto";
import { createR2Client } from "@eskra-aws-playground/integration-r2/r2-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import { scanMediaObjects } from "@/features/media-sync/media-object-scan.js";
import { buildMediaSyncPlan } from "@/features/media-sync/sync-plan.js";
import { resolveUnknownObjects } from "@/features/media-sync/unknown-object-resolution.js";
import { getMediaSyncSettings } from "./runtime-settings.js";
import { enqueueMissingThumbnails } from "./thumbnail-enqueue.js";

const logger = createBatchLogger("media-sync");

// Lambda の timeout(15 分)より後ろに置き、終了を書けずに落ちた実行で詰まらないようにする
const STALE_RUN_THRESHOLD_MS = 20 * 60 * 1000;

// 進捗の書き戻しが同期そのものより重くならない間隔
const PROGRESS_INTERVAL = 1_000;

/** 同期 1 回分の結果。 */
export interface MediaSyncResponse {
	runId: string | undefined;
	skipped: boolean;
	scannedCount: number;
	insertedCount: number;
	updatedCount: number;
	deletedCount: number;
}

const toMessage = (error: unknown): string => {
	return error instanceof Error ? error.message : String(error);
};

/**
 * R2 と DB の差分を反映する。
 * ListObjectsV2 は custom metadata を返さないため、既知の key は一覧だけで
 * 突き合わせ、未知の key にだけ HeadObject を打つ。
 */
export const mediaSyncJob = async (): Promise<MediaSyncResponse> => {
	const startedAt = new Date();
	const running = await mediaSyncRunRepository.findRunning();

	if (running) {
		const elapsedMs = startedAt.getTime() - running.startedAt.getTime();

		if (elapsedMs < STALE_RUN_THRESHOLD_MS) {
			logger.complete({ skipped: true, runningId: running.id });

			return {
				runId: undefined,
				skipped: true,
				scannedCount: 0,
				insertedCount: 0,
				updatedCount: 0,
				deletedCount: 0,
			};
		}

		await mediaSyncRunRepository.finish({
			id: running.id,
			scannedCount: running.scannedCount,
			insertedCount: running.insertedCount,
			updatedCount: running.updatedCount,
			deletedCount: running.deletedCount,
			finishedAt: startedAt,
			error: "終了が記録されないまま打ち切られました",
		});
	}

	const settings = getMediaSyncSettings();
	const client = createR2Client(settings.credentials);
	const runId = randomUUID();
	const progress = {
		scannedCount: 0,
		insertedCount: 0,
		updatedCount: 0,
		deletedCount: 0,
	};

	await mediaSyncRunRepository.start(runId, startedAt);
	logger.start({ runId });

	try {
		const scanned = await scanMediaObjects(client, settings.bucket);
		const known = await mediaObjectRepository.findAllKeys();
		const plan = buildMediaSyncPlan({ scanned, known });

		progress.scannedCount = scanned.length;
		await mediaSyncRunRepository.updateProgress({ id: runId, ...progress });

		let notifiedAt = 0;
		const { inserts, relocations } = await resolveUnknownObjects(client, {
			bucket: settings.bucket,
			objects: plan.unknownObjects,
			knownIds: new Set(
				known.map((media) => {
					return media.id;
				}),
			),
			syncedAt: startedAt,
			onProgress: async (resolved) => {
				const resolvedCount =
					resolved.inserts.length + resolved.relocations.length;

				if (resolvedCount - notifiedAt < PROGRESS_INTERVAL) {
					return;
				}

				notifiedAt = resolvedCount;
				// DB へ書く前の途中経過。確定値は反映後に finish で上書きする
				await mediaSyncRunRepository.updateProgress({
					id: runId,
					...progress,
					insertedCount: resolved.inserts.length,
					updatedCount: resolved.relocations.length,
				});
			},
		});

		// 移動は「古い key の欠落」としても現れるため、削除の対象から外す
		const relocatedIds = new Set(
			relocations.map((relocation) => {
				return relocation.id;
			}),
		);
		const deletableIds = plan.missingIds.filter((id) => {
			return !relocatedIds.has(id);
		});

		progress.insertedCount = await mediaObjectRepository.insertMany(inserts);
		progress.updatedCount =
			await mediaObjectRepository.relocateMany(relocations);
		progress.deletedCount =
			await mediaObjectRepository.deleteByIds(deletableIds);
		await mediaObjectRepository.touchMany(plan.unchangedIds, startedAt);
		const enqueuedCount = await enqueueMissingThumbnails();

		await mediaSyncRunRepository.finish({
			id: runId,
			...progress,
			finishedAt: new Date(),
		});
		logger.complete({ runId, ...progress, enqueuedCount });

		return { runId, skipped: false, ...progress };
	} catch (error) {
		await mediaSyncRunRepository.finish({
			id: runId,
			...progress,
			finishedAt: new Date(),
			error: toMessage(error),
		});
		logger.failure(error, { runId, ...progress });

		throw error;
	}
};
