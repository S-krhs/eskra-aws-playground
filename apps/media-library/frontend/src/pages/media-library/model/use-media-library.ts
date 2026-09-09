// In scope: the screen's own state — the filter it is showing, and tying the sync's result to the listing
// Out of scope: fetching either of them, what the sync does, rendering
import { useState } from "react";
import type { MediaFilter } from "@/entities/media";
import { type MediaList, useMediaList } from "@/features/media-grid";
import { type SyncStatus, useSyncStatus } from "@/features/sync-control";

/** Everything the screen renders from, with the two features already tied together. */
export interface MediaLibrary {
	filter: MediaFilter;
	setFilter: (filter: MediaFilter) => void;
	list: MediaList;
	status: SyncStatus;
}

export const useMediaLibrary = (): MediaLibrary => {
	const [filter, setFilter] = useState<MediaFilter>({});
	const status = useSyncStatus();
	// A finished sync changes this, which refetches the listing so what it took in shows up
	const list = useMediaList({
		filter,
		syncedAt: status.latest?.finishedAt ?? null,
	});

	return { filter, setFilter, list, status };
};
