// In scope: 同期の手動起動と進捗参照の HTTP route
// Out of scope: 同期そのものの実行、Lambda 呼び出しの組み立て、実行記録の書き込み
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import type { MediaSyncRun } from "@eskra-aws-playground/repositories/media/media-sync-run/types.js";
import { Hono } from "hono";
import { startMediaSync } from "../features/media-sync-trigger/media-sync-trigger.js";
import type { LibraryContext } from "../shared/library-context.js";

const toRunView = (run: MediaSyncRun) => {
	return {
		id: run.id,
		startedAt: run.startedAt.toISOString(),
		finishedAt: run.finishedAt?.toISOString() ?? null,
		scannedCount: run.scannedCount,
		insertedCount: run.insertedCount,
		updatedCount: run.updatedCount,
		deletedCount: run.deletedCount,
		error: run.error ?? null,
	};
};

/** 同期の起動と進捗の route を組み立てる。 */
export const createSyncRoutes = (context: LibraryContext) => {
	return new Hono()
		.post("/", async (c) => {
			await startMediaSync({
				functionName: context.settings.syncFunctionName,
				region: context.settings.awsRegion,
			});

			// Lambda の完了は待たない。進捗は /status を読んで確かめる
			return c.json({ started: true });
		})
		.get("/status", async (c) => {
			const [latest, running] = await Promise.all([
				mediaSyncRunRepository.findLatest(),
				mediaSyncRunRepository.findRunning(),
			]);

			return c.json({
				latest: latest ? toRunView(latest) : null,
				running: running ? toRunView(running) : null,
			});
		});
};
