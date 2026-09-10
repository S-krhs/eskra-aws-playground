// In scope: reading the sync's progress and asking for a new run
// Out of scope: running the sync, fetching the listing, rendering
import { type SyncRun, useReadSyncStatus, useStartSync } from "@/shared/api";

// Poll fast only while a run is in flight. A sync takes minutes, so anything finer changes nothing on screen
const RUNNING_INTERVAL_MS = 2_000;
const IDLE_INTERVAL_MS = 30_000;

// The generated hooks type their error as unknown, so it is narrowed here rather than at each use
const toMessage = (error: unknown): string | undefined => {
	if (!error) {
		return undefined;
	}

	return error instanceof Error ? error.message : String(error);
};

/** The sync's state and the one action the screen can take. */
export interface SyncStatus {
	latest: SyncRun | null;
	running: SyncRun | null;
	/** False until the first read comes back, so a caller can tell "no runs" from "not read yet". */
	isLoaded: boolean;
	isStarting: boolean;
	error: string | undefined;
	start: () => void;
}

export const useSyncStatus = (): SyncStatus => {
	const status = useReadSyncStatus({
		query: {
			refetchInterval: (query) => {
				const data = query.state.data;

				return data?.status === 200 && data.data.running
					? RUNNING_INTERVAL_MS
					: IDLE_INTERVAL_MS;
			},
		},
	});
	const start = useStartSync({
		mutation: {
			// The run record appears on the Lambda's side; refetching moves polling to the shorter interval
			onSuccess: () => {
				return status.refetch();
			},
		},
	});

	// A 500 comes back as a resolved response rather than a rejection, so it is read off the union here
	const body = status.data?.status === 200 ? status.data.data : undefined;
	const failure =
		status.data?.status === 500 ? status.data.data.message : undefined;

	return {
		latest: body?.latest ?? null,
		running: body?.running ?? null,
		isLoaded: !status.isPending,
		isStarting: start.isPending,
		error: failure ?? toMessage(status.error ?? start.error),
		start: () => {
			start.mutate();
		},
	};
};
