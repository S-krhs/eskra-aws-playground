// In scope: R2 の走査結果を DB へ反映し、同期の実行記録と進捗を残す
// Out of scope: 未知 key の判定、R2 の wire 解釈、サムネイル生成、起動 envelope の検証
import { randomUUID } from "node:crypto";
import {
	createR2Client,
	parseR2CredentialsJson,
} from "@eskra-aws-playground/integration-r2/r2-client.js";
import { r2ObjectStore } from "@eskra-aws-playground/integration-r2/r2-object-store.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/contracts/media-job-names.js";
import { buildThumbnailKey } from "@eskra-aws-playground/shared-domains/protocols/media-object-key.js";
import { Resource } from "sst/resource";
import { z } from "zod";
import { assertDeletableSize } from "@/features/media-sync/delete-guard.js";
import { scanMediaObjects } from "@/features/media-sync/media-object-scan.js";
import { buildMediaSyncPlan } from "@/features/media-sync/sync-plan.js";
import { enqueueMissingThumbnails } from "@/features/media-sync/thumbnail-enqueue.js";
import { resolveUnknownObjects } from "@/features/media-sync/unknown-object-resolution.js";
import { batchJobNames } from "@/handlers/batch/contracts/job-names.js";
import type { BatchResponse } from "@/handlers/batch/schema.js";

const logger = createBatchLogger(batchJobNames.mediaSync);

// 実行中の記録を打ち切り扱いにするまでの経過時間の閾値。
// Lambda の timeout(15 分)より長く取り、まだ実行中の正常なジョブを誤って打ち切り扱いにしないようにする。
const STALE_RUN_THRESHOLD_MS = 20 * 60 * 1000;

// 進捗を DB へ書き戻す間隔(件数)。書き戻し自体が同期処理の負荷にならないよう、逐次ではなくまとめて書く。
const PROGRESS_INTERVAL = 1_000;

/** 同期ジョブの起動イベントを検証する schema。 */
const mediaSyncEventSchema = z.object({
	/** 大量削除を防ぐガードを無効にする。内容を確認したうえで手動起動するときに true にする。 */
	allowBulkDelete: z.boolean().default(false),
});

/**
 * R2 と DB の差分を反映する。
 * ListObjectsV2 は custom metadata を返さないため、既知の key は一覧だけで
 * 突き合わせ、未知の key にだけ HeadObject を打つ。
 */
export const mediaSyncJob = async (event: unknown): Promise<BatchResponse> => {
	// 1. 起動イベントを検証し、大量削除ガードを外すかどうかを取り出す。
	const { allowBulkDelete } = mediaSyncEventSchema.parse(event ?? {});

	// 2. 実行中の同期記録があるか確認する。閾値内であればここで終了し、
	//    閾値を超えていれば打ち切り扱いで前回の記録を閉じてから先へ進む。
	const startedAt = new Date();
	const running = await mediaSyncRunRepository.findRunning();

	if (running) {
		const elapsedMs = startedAt.getTime() - running.startedAt.getTime();

		if (elapsedMs < STALE_RUN_THRESHOLD_MS) {
			logger.complete({ skipped: true, runningId: running.id });

			return {
				ok: true,
				job: batchJobNames.mediaSync,
				details: { skipped: true, runningId: running.id },
			};
		}

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

	// 3. R2 の接続設定を解決し、この実行の記録を開始する。
	const bucket = process.env.MEDIA_BUCKET;

	if (!bucket) {
		throw new Error("MEDIA_BUCKET が設定されていません。");
	}

	const client = createR2Client(
		parseR2CredentialsJson(Resource.R2Credentials.value),
	);
	const runId = randomUUID();
	const progress = {
		scannedCount: 0,
		insertedCount: 0,
		updatedCount: 0,
		deletedCount: 0,
	};

	await mediaSyncRunRepository.start(runId, startedAt);

	// 4. 実行記録の登録直後にもう一度確認し、同時に始まった実行があれば後発のこちらを降ろす。
	//    findRunning と start の間に別の実行が始まる可能性があるため、二重登録を防ぐ。
	const earliestRunning = await mediaSyncRunRepository.findRunning();

	if (earliestRunning && earliestRunning.id !== runId) {
		await mediaSyncRunRepository.finish({
			id: runId,
			...progress,
			finishedAt: new Date(),
			error: "同時に始まった実行があるため取りやめました",
		});
		logger.complete({ skipped: true, runningId: earliestRunning.id });

		return {
			ok: true,
			job: batchJobNames.mediaSync,
			details: { skipped: true, runningId: earliestRunning.id },
		};
	}

	logger.start({ runId });

	try {
		// 5. R2 を走査し、DB の既知一覧と突き合わせて同期の plan を作る。
		const scanned = await scanMediaObjects(client, bucket);
		const known = await mediaObjectRepository.findAllSummaries();

		// R2 の一覧が空なのに DB に登録が残っている場合は、token の権限不足か bucket 指定の誤りとみなしてエラーにする
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
			bucket: bucket,
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
				// ここで書く insertedCount と updatedCount は未確定の途中経過であり、確定値は反映後に finish で上書きする
				await mediaSyncRunRepository.updateProgress({
					id: runId,
					...progress,
					insertedCount: partial.inserts.length,
					updatedCount: partial.relocations.length,
				});
			},
		});

		// 7. 削除対象から移動済みのものを除外する。
		//    移動は元の key が消えた形で検出されるため、削除ではなく移動として扱う。
		const relocatedIds = new Set(
			resolved.relocations.map((relocation) => {
				return relocation.id;
			}),
		);
		const deletableIds = plan.missingIds.filter((id) => {
			return !relocatedIds.has(id);
		});

		// 8. 追加と更新を先に DB へ反映する。
		//    削除ガードで中断しても新規取り込みや更新は失わないよう、削除より先に確定させる。
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

		// 9. 大量削除を防ぐガードを通す。allowBulkDelete が true の場合はスキップする。
		if (!allowBulkDelete) {
			assertDeletableSize(deletableIds.length, known.length);
		}

		// 10. サムネイルを R2 から削除し、続けて DB の行を削除する。
		//     行を削除すると R2 の走査からサムネイルを辿れなくなるため、必ず先に消す。
		//     サムネイルの key は UUID から導けるため、DB の thumbnailKey が空の行でも削除できる。
		for (const id of deletableIds) {
			await r2ObjectStore.delete(client, {
				bucket: bucket,
				key: buildThumbnailKey(id),
			});
		}

		progress.deletedCount =
			await mediaObjectRepository.deleteByIds(deletableIds);

		// 11. サムネイル未生成のメディアを queue へ投入する。
		//     削除より先に投入すると、消える予定のメディアにも生成を依頼してしまうため、削除の後に行う。
		const enqueuedCount = await enqueueMissingThumbnails({
			queueUrl: Resource.MediaThumbnailQueue.url,
			job: mediaJobNames.mediaThumbnail,
			enqueuedAt: new Date(),
		});

		// 12. 実行記録を確定し、結果をログとレスポンスに残す。
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
