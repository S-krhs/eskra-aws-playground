// In scope: 同期の起動と、実行中の進捗のポーリング
// Out of scope: 同期そのものの実行、一覧の取得、表示
import type { InferResponseType } from "hono/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/shared/api";

type StatusResponse = InferResponseType<
	(typeof apiClient.sync.status)["$get"],
	200
>;

/** 同期 1 回分の実行記録。backend の応答から型を導出する。 */
export type SyncRun = NonNullable<StatusResponse["latest"]>;

/** 同期の状態と操作。 */
export interface SyncStatus {
	latest: SyncRun | undefined;
	running: SyncRun | undefined;
	isStarting: boolean;
	error: string | undefined;
	start: () => void;
}

// 実行中だけ短い間隔で読む。同期は分単位で掛かるので、これ以上細かくしても見え方は変わらない
const RUNNING_INTERVAL_MS = 2_000;
const IDLE_INTERVAL_MS = 30_000;

/**
 * 同期の進捗を読み続ける。
 * 実行中は 2 秒ごと、そうでなければ 30 秒ごとに読む。
 */
export const useSyncStatus = (onFinished: () => void): SyncStatus => {
	const [latest, setLatest] = useState<SyncRun | undefined>(undefined);
	const [running, setRunning] = useState<SyncRun | undefined>(undefined);
	const [isStarting, setIsStarting] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);

	// 実行中から実行中でないへ変わった回だけ一覧を取り直すため、前回の状態を覚えておく
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

				// 実行記録は Lambda 側で作られる。読みに行く間隔を短い方へ切り替える
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
