// In scope: R2 の走査結果を DB へ反映し、同期の実行記録と進捗を残す
// Out of scope: 未知 key の判定、R2 の wire 解釈、サムネイル生成、起動 envelope の検証
import { randomUUID } from "node:crypto";
import { createR2Client } from "@eskra-aws-playground/integration-r2/r2-client.js";
import { r2ObjectStore } from "@eskra-aws-playground/integration-r2/r2-object-store.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/contracts/media-job-names.js";
import { buildThumbnailKey } from "@eskra-aws-playground/shared-domains/protocols/media-object-key.js";
import { Resource } from "sst/resource";
import { z } from "zod";
import { parseMediaStorageSettings } from "@/features/media-storage/media-storage-settings.js";
import { assertDeletableSize } from "@/features/media-sync/delete-guard.js";
import { scanMediaObjects } from "@/features/media-sync/media-object-scan.js";
import { buildMediaSyncPlan } from "@/features/media-sync/sync-plan.js";
import { enqueueMissingThumbnails } from "@/features/media-sync/thumbnail-enqueue.js";
import { resolveUnknownObjects } from "@/features/media-sync/unknown-object-resolution.js";
import { batchJobNames } from "../contracts/job-names.js";
import type { BatchResponse } from "../schema.js";

const logger = createBatchLogger(batchJobNames.mediaSync);

// Lambda の timeout(15 分)より後ろに置き、終了を書けずに落ちた実行で詰まらないようにする
const STALE_RUN_THRESHOLD_MS = 20 * 60 * 1000;

// 進捗の書き戻しが同期そのものより重くならない間隔
const PROGRESS_INTERVAL = 1_000;

/** 同期 job が受け取るイベントの詳細。 */
const mediaSyncEventSchema = z.object({
	/** 大量削除の歯止めを外す。中身を確かめたうえで手動起動するときに使う。 */
	allowBulkDelete: z.boolean().default(false),
});

const toMessage = (error: unknown): string => {
	return error instanceof Error ? error.message : String(error);
};

const guardDeletion = (
	deletableCount: number,
	knownCount: number,
): string | undefined => {
	try {
		assertDeletableSize(deletableCount, knownCount);

		return undefined;
	} catch (error) {
		return toMessage(error);
	}
};

const toResponse = (details: Record<string, unknown>): BatchResponse => {
	return { ok: true, job: batchJobNames.mediaSync, details };
};

/**
 * R2 と DB の差分を反映する。
 * ListObjectsV2 は custom metadata を返さないため、既知の key は一覧だけで
 * 突き合わせ、未知の key にだけ HeadObject を打つ。
 */
export const mediaSyncJob = async (event: unknown): Promise<BatchResponse> => {
	// 1. 起動イベントから歯止めの扱いを決める。
	const { allowBulkDelete } = mediaSyncEventSchema.parse(event ?? {});

	// 2. 実行中の同期があれば降りる。打ち切られた記録は先に閉じる。
	const startedAt = new Date();
	const running = await mediaSyncRunRepository.findRunning();

	if (running) {
		const elapsedMs = startedAt.getTime() - running.startedAt.getTime();

		if (elapsedMs < STALE_RUN_THRESHOLD_MS) {
			logger.complete({ skipped: true, runningId: running.id });

			return toResponse({ skipped: true, runningId: running.id });
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

	// 3. 接続先を解決してから実行記録を開始する。
	const settings = parseMediaStorageSettings({
		credentialsJson: Resource.R2Credentials.value,
		bucket: process.env.MEDIA_BUCKET,
	});
	const client = createR2Client(settings.credentials);
	const runId = randomUUID();
	const progress = {
		scannedCount: 0,
		insertedCount: 0,
		updatedCount: 0,
		deletedCount: 0,
	};

	await mediaSyncRunRepository.start(runId, startedAt);

	// 4. findRunning と start の間に始まった実行がないか確かめ、後発が降りる。
	const earliestRunning = await mediaSyncRunRepository.findRunning();

	if (earliestRunning && earliestRunning.id !== runId) {
		await mediaSyncRunRepository.finish({
			id: runId,
			...progress,
			finishedAt: new Date(),
			error: "同時に始まった実行があるため取りやめました",
		});
		logger.complete({ skipped: true, runningId: earliestRunning.id });

		return toResponse({ skipped: true, runningId: earliestRunning.id });
	}

	logger.start({ runId });

	try {
		// 5. R2 の一覧と登録済みを突き合わせる。
		const scanned = await scanMediaObjects(client, settings.bucket);
		const known = await mediaObjectRepository.findAllSummaries();

		// 一覧が空なのに登録があるのは、権限か bucket 指定の誤りとみなす
		if (scanned.length === 0 && known.length > 0) {
			throw new Error(
				"R2 の一覧が空でした。token の権限か MEDIA_BUCKET の指定を確認してください。",
			);
		}

		const plan = buildMediaSyncPlan({ scanned, known });

		progress.scannedCount = scanned.length;
		await mediaSyncRunRepository.updateProgress({ id: runId, ...progress });

		// 6. 未知の key だけ HeadObject を打ち、新規・移動・取り込みへ振り分ける。
		let notifiedAt = 0;
		const resolved = await resolveUnknownObjects(client, {
			bucket: settings.bucket,
			objects: plan.unknownObjects,
			known: {
				knownIds: new Set(
					known.map((media) => {
						return media.id;
					}),
				),
				missingIds: new Set(plan.missingIds),
			},
			syncedAt: startedAt,
			onProgress: async (partial) => {
				const resolvedCount =
					partial.inserts.length + partial.relocations.length;

				if (resolvedCount - notifiedAt < PROGRESS_INTERVAL) {
					return;
				}

				notifiedAt = resolvedCount;
				// DB へ書く前の途中経過。確定値は反映後に finish で上書きする
				await mediaSyncRunRepository.updateProgress({
					id: runId,
					...progress,
					insertedCount: partial.inserts.length,
					updatedCount: partial.relocations.length,
				});
			},
		});

		// 7. 移動は「古い key の欠落」としても現れるため、削除の対象から外す。
		const relocatedIds = new Set(
			resolved.relocations.map((relocation) => {
				return relocation.id;
			}),
		);
		const deletableIds = plan.missingIds.filter((id) => {
			return !relocatedIds.has(id);
		});

		// 8. 取り込みと移動を反映する。ここは歯止めに関わらず毎回通す。
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

		// 9. サムネイル未生成を queue へ積む。
		const enqueuedCount = await enqueueMissingThumbnails({
			queueUrl: Resource.MediaThumbnailQueue.url,
			job: mediaJobNames.mediaThumbnail,
		});

		// 10. 削除だけを歯止めの対象にする。掛かった場合は削除を飛ばして理由を残す。
		const deleteBlockedReason = allowBulkDelete
			? undefined
			: guardDeletion(deletableIds.length, known.length);

		if (!deleteBlockedReason) {
			// 行を消すとサムネイルは走査から外れて辿れなくなるため、先に R2 から消す。
			// key は UUID から導けるので、DB の thumbnailKey が空でも取りこぼさない
			for (const id of deletableIds) {
				await r2ObjectStore.delete(client, {
					bucket: settings.bucket,
					key: buildThumbnailKey(id),
				});
			}

			progress.deletedCount =
				await mediaObjectRepository.deleteByIds(deletableIds);
		}

		await mediaSyncRunRepository.finish({
			id: runId,
			...progress,
			finishedAt: new Date(),
			error: deleteBlockedReason,
		});

		if (deleteBlockedReason) {
			logger.failure(new Error(deleteBlockedReason), { runId, ...progress });

			throw new Error(deleteBlockedReason);
		}

		logger.complete({
			runId,
			...progress,
			enqueuedCount,
			skippedCount: resolved.skippedCount,
		});

		return toResponse({
			runId,
			...progress,
			enqueuedCount,
			skippedCount: resolved.skippedCount,
		});
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
