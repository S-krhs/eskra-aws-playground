// In scope: the HTTP routes starting a sync by hand and reading its progress
// Out of scope: running the sync itself, assembling the Lambda call, writing the run record
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import type { MediaSyncRun } from "@eskra-aws-playground/repositories/media/media-sync-run/types.js";
import { Hono } from "hono";
import { startMediaSync } from "../features/media-sync-trigger/media-sync-trigger.js";
import { getLibrarySettings } from "../shared/library-settings.js";

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

export const syncRoutes = new Hono()
	.post("/", async (c) => {
		const settings = getLibrarySettings();
		await startMediaSync({
			functionName: settings.syncFunctionName,
			region: settings.awsRegion,
		});

		// The Lambda isn't waited on; progress is read from /status
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
