// In scope: reading the latest run and the one in flight, and shaping them for the screen
// Out of scope: starting a sync, running it, HTTP status codes
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import type { MediaSyncRun } from "@eskra-aws-playground/repositories/media/media-sync-run/types.js";
import type {
	SyncRun,
	SyncStatusResponse,
} from "@eskra-aws-playground/shared-domains/media/library-api.js";
import type { OperationResult } from "../../intermediate-models/operation-result.js";

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

export const readSyncStatusOperation = async (): Promise<
	OperationResult<SyncStatusResponse>
> => {
	const [latest, running] = await Promise.all([
		mediaSyncRunRepository.findLatest(),
		mediaSyncRunRepository.findUnfinished(),
	]);

	return {
		kind: "OK",
		data: {
			latest: latest ? toSyncRun(latest) : null,
			running: running ? toSyncRun(running) : null,
		},
	};
};
