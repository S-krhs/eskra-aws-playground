// In scope: 同期ボタンと、実行中の進捗・直近の結果の表示
// Out of scope: 同期の起動処理、状態の取得、一覧の表示
import { formatUploadedAt } from "@/shared/lib/format.js";
import type { SyncStatus } from "../model/use-sync-status.js";

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

/** 同期の起動ボタンと進捗。実行中はボタンを押せなくする。 */
export const SyncControl = ({ status }: { status: SyncStatus }) => {
	const isRunning = status.running !== undefined;

	return (
		<div className="flex flex-wrap items-center gap-3">
			<button
				type="button"
				disabled={isRunning || status.isStarting}
				onClick={status.start}
				className="rounded bg-teal-700 px-3 py-1 text-sm text-white disabled:bg-slate-400"
			>
				{isRunning ? "同期中…" : "同期する"}
			</button>
			<p className="font-mono text-slate-500 text-xs">
				{toProgressText(status)}
			</p>
			{status.error ? (
				<p className="text-red-700 text-xs dark:text-red-300">{status.error}</p>
			) : null}
		</div>
	);
};
