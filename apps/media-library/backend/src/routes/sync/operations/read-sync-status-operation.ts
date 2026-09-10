// In scope: reading the latest run and the one in flight, and shaping them for the screen
// Out of scope: starting a sync, running it, HTTP status codes
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import type { MediaSyncRun } from "@eskra-aws-playground/repositories/media/media-sync-run/types.js";
import type {
	SyncRun,
	SyncStatusResponse,
} from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

// What the run recorded is the sync job's own exception message, which can name the DB host or an
// object key. The detail stays in the run record and the job's log; the screen is told only that it failed.
const FAILED_MESSAGE = "同期に失敗しました。実行ログを確認してください。";

/** Lists what may leave, so a column added to the run record can't reach the screen on its own. */
const toSyncRun = (run: MediaSyncRun): SyncRun => {
	return {
		id: run.id,
		startedAt: run.startedAt.toISOString(),
		finishedAt: run.finishedAt?.toISOString() ?? null,
		scannedCount: run.scannedCount,
		insertedCount: run.insertedCount,
		updatedCount: run.updatedCount,
		deletedCount: run.deletedCount,
		error: run.error === null ? null : FAILED_MESSAGE,
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
