// In scope: the sync button, the in-flight progress, and the last run's result
// Out of scope: starting the sync, fetching the status, showing the listing
import { formatDateTime } from "@/shared/lib";
import type { SyncStatus } from "../api/use-sync-status.js";

/** Where the sync stands, split so the counts can be set in mono below the sentence about them. */
const toProgress = (
	status: SyncStatus,
): { headline: string; counts?: string } => {
	if (status.running) {
		const { scannedCount, insertedCount, updatedCount, deletedCount } =
			status.running;

		return {
			headline: `走査 ${scannedCount} 件`,
			counts: `追加 ${insertedCount} / 更新 ${updatedCount} / 削除 ${deletedCount}`,
		};
	}

	if (!status.latest) {
		return { headline: "まだ一度も実行していません" };
	}

	if (status.latest.error) {
		return { headline: `前回は失敗しました: ${status.latest.error}` };
	}

	return {
		headline: `前回 ${formatDateTime(status.latest.startedAt)}`,
		counts: `追加 ${status.latest.insertedCount} / 更新 ${status.latest.updatedCount} / 削除 ${status.latest.deletedCount}`,
	};
};

/** The start button and its progress; the button is disabled while a sync runs. */
export const SyncControl = ({ status }: { status: SyncStatus }) => {
	// The run record is created on the Lambda's side, so nothing is running yet from the moment the
	// button is pressed until the status comes back — the button says so rather than sitting mute
	const isBusy = status.running !== null || status.isStarting;
	const progress = toProgress(status);

	return (
		<div className="flex flex-col gap-2 border-base-300 border-t pt-3 md:pt-4">
			<button
				type="button"
				disabled={isBusy}
				onClick={status.start}
				className="btn btn-primary btn-sm self-start rounded-full md:self-stretch"
			>
				{isBusy ? (
					<span className="loading loading-spinner loading-xs" />
				) : null}
				{isBusy ? "同期中…" : "同期する"}
			</button>
			<div className="text-base-content/60 text-xs">
				<p>{progress.headline}</p>
				{progress.counts ? (
					<p className="font-mono">{progress.counts}</p>
				) : null}
			</div>
			{status.error ? (
				<p className="text-error text-xs">{status.error}</p>
			) : null}
		</div>
	);
};
