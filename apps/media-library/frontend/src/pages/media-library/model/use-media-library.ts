// In scope: the screen's own state — the filter it is showing, and tying the sync's result to the listing
// Out of scope: fetching either of them, what the sync does, rendering
import { useState } from "react";
import type { MediaFilter } from "@/entities/media";
import { type MediaList, useMediaList } from "@/features/media-grid";
import { type MediaTrash, useMediaTrash } from "@/features/media-trash";
import { type SyncStatus, useSyncStatus } from "@/features/sync-control";
import type { Media } from "@/shared/api";

/** Everything the screen renders from, with the features already tied together. */
export interface MediaLibrary {
	filter: MediaFilter;
	setFilter: (filter: MediaFilter) => void;
	list: MediaList;
	status: SyncStatus;
	trash: MediaTrash;
	/** The media the preview is open on; null while none is. */
	preview: Media | null;
	openPreview: (media: Media) => void;
	closePreview: () => void;
}

export const useMediaLibrary = (): MediaLibrary => {
	const [filter, setFilter] = useState<MediaFilter>({});
	// What the preview shows is the row the listing already handed over, so opening one asks for nothing
	const [preview, setPreview] = useState<Media | null>(null);
	const status = useSyncStatus();
	const trash = useMediaTrash();

	// The listing is keyed off the last sync that closed out, so taking one in shows up without anything
	// having to watch for it. `latest` covers the run in flight as well and reports no finish time while
	// one is going, and following it down to null there would throw away every page already scrolled
	const [syncedAt, setSyncedAt] = useState<string | null | undefined>(
		undefined,
	);
	const reportedAt = status.isLoaded
		? (status.latest?.finishedAt ?? null)
		: undefined;
	const isNewer =
		reportedAt !== undefined &&
		reportedAt !== syncedAt &&
		(reportedAt !== null || syncedAt === undefined);

	if (isNewer) {
		setSyncedAt(reportedAt);
	}

	const list = useMediaList({ filter, syncedAt });

	return {
		filter,
		setFilter,
		list,
		status,
		trash,
		preview,
		openPreview: (media: Media) => {
			setPreview(media);
		},
		closePreview: () => {
			setPreview(null);
		},
	};
};
