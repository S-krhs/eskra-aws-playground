// In scope: assembling the filter, listing, preview and sync features into one screen
// Out of scope: each feature's implementation, calling the API, formatting
import { MediaFilterBar } from "@/features/media-filter";
import { MediaGrid } from "@/features/media-grid";
import { MediaPreviewDialog } from "@/features/media-preview";
import { SyncControl } from "@/features/sync-control";
import { useMediaLibrary } from "../model/use-media-library.js";

export const MediaLibraryPage = () => {
	const {
		filter,
		setFilter,
		list,
		status,
		preview,
		openPreview,
		closePreview,
	} = useMediaLibrary();

	return (
		<div className="flex h-dvh flex-col bg-base-200 text-base-content">
			<header className="flex flex-wrap items-center justify-between gap-3 border-base-300 border-b bg-base-100 px-3 py-2">
				<MediaFilterBar filter={filter} onChange={setFilter} />
				<SyncControl status={status} />
			</header>
			<main className="min-h-0 flex-1">
				<MediaGrid list={list} onSelect={openPreview} />
			</main>
			{preview ? (
				<MediaPreviewDialog media={preview} onClose={closePreview} />
			) : null}
		</div>
	);
};
