// In scope: reading the latest run and the one in flight, and shaping them for the screen
// Out of scope: starting a sync, running it, HTTP status codes
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import type { MediaSyncRun } from "@eskra-aws-playground/repositories/media/media-sync-run/types.js";
import type {
	SyncRun,
	SyncStatusResponse,
} from "@eskra-aws-playground/shared-domains/contracts/media-library-api.js";

const toSyncRun = (run: MediaSyncRun): SyncRun => {
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

export const readSyncStatusOperation =
	async (): Promise<SyncStatusResponse> => {
		const [latest, running] = await Promise.all([
			mediaSyncRunRepository.findLatest(),
			mediaSyncRunRepository.findRunning(),
		]);

		return {
			latest: latest ? toSyncRun(latest) : null,
			running: running ? toSyncRun(running) : null,
		};
	};
