// In scope: starting a sync and polling its progress while it runs
// Out of scope: running the sync itself, fetching the listing, display
import type { InferResponseType } from "hono/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/shared/api";

type StatusResponse = InferResponseType<
	(typeof apiClient.sync.status)["$get"],
	200
>;

/** One sync run record; the type is derived from the backend's response. */
export type SyncRun = NonNullable<StatusResponse["latest"]>;

export interface SyncStatus {
	latest: SyncRun | undefined;
	running: SyncRun | undefined;
	isStarting: boolean;
	error: string | undefined;
	start: () => void;
}

// Only a running sync is read on the short interval; a sync takes minutes, so anything finer changes nothing on screen
const RUNNING_INTERVAL_MS = 2_000;
const IDLE_INTERVAL_MS = 30_000;

/** Read every 2 seconds while running, every 30 seconds otherwise. */
export const useSyncStatus = (onFinished: () => void): SyncStatus => {
	const [latest, setLatest] = useState<SyncRun | undefined>(undefined);
	const [running, setRunning] = useState<SyncRun | undefined>(undefined);
	const [isStarting, setIsStarting] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);

	// The previous state is remembered, so the listing only refetches on the running-to-idle transition
	const wasRunning = useRef(false);
	const finishedCallback = useRef(onFinished);
	finishedCallback.current = onFinished;

	const [runningNow, setRunningNow] = useState(false);

	useEffect(() => {
		let cancelled = false;

		const read = async () => {
			try {
				const response = await apiClient.sync.status.$get();

				if (!response.ok) {
					throw new Error(`同期の状態を読めませんでした (${response.status})`);
				}

				const status = await response.json();

				if (cancelled) {
					return;
				}

				setLatest(status.latest ?? undefined);
				setRunning(status.running ?? undefined);
				setRunningNow(status.running !== null);
				setError(undefined);

				if (wasRunning.current && status.running === null) {
					finishedCallback.current();
				}

				wasRunning.current = status.running !== null;
			} catch (cause) {
				if (!cancelled) {
					setError(cause instanceof Error ? cause.message : String(cause));
				}
			}
		};

		void read();

		const timer = setInterval(
			read,
			runningNow ? RUNNING_INTERVAL_MS : IDLE_INTERVAL_MS,
		);

		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [runningNow]);

	const start = useCallback(() => {
		setIsStarting(true);
		setError(undefined);

		void (async () => {
			try {
				const response = await apiClient.sync.$post();

				if (!response.ok) {
					throw new Error(`同期を起動できませんでした (${response.status})`);
				}

				// The run record is created on the Lambda side; switch to the shorter read interval
				setRunningNow(true);
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : String(cause));
			} finally {
				setIsStarting(false);
			}
		})();
	}, []);

	return { latest, running, isStarting, error, start };
};
