// In scope: reading the latest run and the one in flight, and shaping them for the screen
// Out of scope: starting a sync, running it, HTTP status codes
import { mediaSyncRunRepository } from "@eskra-aws-playground/repositories/media/media-sync-run/repository.js";
import type { SyncStatusResponse } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

export const readSyncStatusOperation = async (): Promise<
	OperationResult<SyncStatusResponse>
> => {
	const [latest, running] = await Promise.all([
		mediaSyncRunRepository.findLatest(),
		mediaSyncRunRepository.findUnfinished(),
	]);

	// Only the two timestamps differ from what the repository returns; the rest carries over as it is
	return {
		kind: "OK",
		data: {
			latest: latest
				? {
						...latest,
						startedAt: latest.startedAt.toISOString(),
						finishedAt: latest.finishedAt?.toISOString() ?? null,
					}
				: null,
			running: running
				? {
						...running,
						startedAt: running.startedAt.toISOString(),
						finishedAt: running.finishedAt?.toISOString() ?? null,
					}
				: null,
		},
	};
};
