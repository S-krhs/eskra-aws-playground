// In scope: 絞り込み・一覧・同期の各機能を 1 画面にまとめる
// Out of scope: 各機能の実装、API の呼び出し、表記の整形
import { useState } from "react";
import type { MediaFilter } from "@/entities/media";
import { MediaFilterBar } from "@/features/media-filter";
import { MediaGrid, useMediaPage } from "@/features/media-grid";
import { SyncControl, useSyncStatus } from "@/features/sync-control";

/** 管理ツールの画面全体。 */
export const MediaLibraryPage = () => {
	const [filter, setFilter] = useState<MediaFilter>({});
	const page = useMediaPage(filter);
	// 同期が終わった時点で取り込まれた分を出すため、一覧を取り直す
	const status = useSyncStatus(page.reload);

	return (
		<div className="flex h-dvh flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
			<header className="flex flex-wrap items-center justify-between gap-3 border-slate-200 border-b px-3 py-2 dark:border-slate-800">
				<MediaFilterBar filter={filter} onChange={setFilter} />
				<SyncControl status={status} />
			</header>
			<main className="min-h-0 flex-1">
				<MediaGrid page={page} />
			</main>
		</div>
	);
};
