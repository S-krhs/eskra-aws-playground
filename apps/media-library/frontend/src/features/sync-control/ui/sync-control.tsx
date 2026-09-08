// In scope: the sync button, the in-flight progress, and the last run's result
// Out of scope: starting the sync, fetching the status, showing the listing
import { formatUploadedAt } from "@/shared/lib/format.js";
import type { SyncStatus } from "../api/use-sync-status.js";

const toProgressText = (status: SyncStatus): string => {
	if (status.running) {
		const { scannedCount, insertedCount, updatedCount, deletedCount } =
			status.running;

		return `走査 ${scannedCount} / 追加 ${insertedCount} / 更新 ${updatedCount} / 削除 ${deletedCount}`;
	}

	if (!status.latest) {
		return "まだ一度も実行していません";
	}

	if (status.latest.error) {
		return `前回は失敗しました: ${status.latest.error}`;
	}

	return `前回 ${formatUploadedAt(status.latest.startedAt)} / 追加 ${status.latest.insertedCount} / 更新 ${status.latest.updatedCount} / 削除 ${status.latest.deletedCount}`;
};

/** The start button and its progress; the button is disabled while a sync runs. */
export const SyncControl = ({ status }: { status: SyncStatus }) => {
	const isRunning = status.running !== null;

	return (
		<div className="flex flex-wrap items-center gap-3">
			<button
				type="button"
				disabled={isRunning || status.isStarting}
				onClick={status.start}
				className="btn btn-primary btn-sm"
			>
				{isRunning ? (
					<span className="loading loading-spinner loading-xs" />
				) : null}
				{isRunning ? "同期中…" : "同期する"}
			</button>
			<p className="font-mono text-base-content/60 text-xs">
				{toProgressText(status)}
			</p>
			{status.error ? (
				<p className="text-error text-xs">{status.error}</p>
			) : null}
		</div>
	);
};
