// In scope: assembling the filter, listing and sync features into one screen
// Out of scope: each feature's implementation, calling the API, formatting
import { useState } from "react";
import type { MediaFilter } from "@/entities/media";
import { MediaFilterBar } from "@/features/media-filter";
import { MediaGrid, useMediaPage } from "@/features/media-grid";
import { SyncControl, useSyncStatus } from "@/features/sync-control";

export const MediaLibraryPage = () => {
	const [filter, setFilter] = useState<MediaFilter>({});
	const page = useMediaPage(filter);
	// Refetch the listing once the sync ends, so what it took in shows up
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
