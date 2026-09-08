// In scope: assembling the filter, listing and sync features into one screen
// Out of scope: each feature's implementation, calling the API, formatting
import { useState } from "react";
import type { MediaFilter } from "@/entities/media";
import { MediaFilterBar } from "@/features/media-filter";
import { MediaGrid, useMediaList } from "@/features/media-grid";
import { SyncControl, useSyncStatus } from "@/features/sync-control";

export const MediaLibraryPage = () => {
	const [filter, setFilter] = useState<MediaFilter>({});
	const status = useSyncStatus();
	// A finished sync changes this, which refetches the listing so what it took in shows up
	const list = useMediaList({
		filter,
		syncedAt: status.latest?.finishedAt ?? null,
	});

	return (
		<div className="flex h-dvh flex-col bg-base-200 text-base-content">
			<header className="flex flex-wrap items-center justify-between gap-3 border-base-300 border-b bg-base-100 px-3 py-2">
				<MediaFilterBar filter={filter} onChange={setFilter} />
				<SyncControl status={status} />
			</header>
			<main className="min-h-0 flex-1">
				<MediaGrid list={list} />
			</main>
		</div>
	);
};
