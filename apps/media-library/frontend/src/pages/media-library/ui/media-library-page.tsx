// In scope: assembling the filter, listing, preview, trash and sync features into one screen, and the
//           words each of them reports itself with
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
		trash,
		clipboard,
		tags,
		move,
		tagSuggestions,
		folderSuggestions,
		preview,
		openPreview,
		closePreview,
	} = useMediaLibrary();
	// The preview has one line to report with, and only one of these is ever going at a time. A failure
	// arrives already worded, so only what to say while it goes is written here
	const actionMessage =
		(move.status.kind === "pending" ? "移しています…" : move.status.message) ??
		(tags.status.kind === "pending"
			? "タグを保存しています…"
			: tags.status.message) ??
		(clipboard.status.kind === "pending"
			? "コピーしています…"
			: clipboard.status.kind === "done"
				? "コピーしました"
				: clipboard.status.message);

	return (
		// The sidebar only forms once there is width for it; below that the same blocks stack above the grid
		<div className="flex h-dvh flex-col bg-base-200 text-base-content md:flex-row">
			<aside className="flex shrink-0 flex-col gap-4 border-base-300 border-b bg-base-100 p-3 md:w-60 md:overflow-y-auto md:border-r md:border-b-0">
				<h1 className="font-bold text-sm">メディアライブラリ</h1>
				<MediaFilterBar
					filter={filter}
					tags={tagSuggestions}
					folders={folderSuggestions}
					onChange={setFilter}
				/>
				{/* Pinned to the foot of the sidebar, away from the filters it has nothing to do with */}
				<div className="md:mt-auto">
					<SyncControl status={status} />
				</div>
			</aside>
			<main className="flex min-h-0 min-w-0 flex-1 flex-col">
				{trash.status.kind === "failed" ? (
					<p role="alert" className="alert alert-error m-3">
						{trash.status.message}
					</p>
				) : null}
				<MediaGrid list={list} onSelect={openPreview} />
			</main>
			{preview ? (
				<MediaPreviewDialog
					media={preview}
					isTrashed={filter.state === "trashed"}
					tagSuggestions={tagSuggestions}
					folderSuggestions={folderSuggestions}
					message={actionMessage}
					onChangeTags={(next) => {
						tags.save(preview.id, next);
					}}
					onMove={(logicalPath) => {
						move.move(preview.id, logicalPath);
					}}
					onCopyImage={() => {
						clipboard.copyImage(preview);
					}}
					onCopyFile={() => {
						clipboard.copyFile(preview);
					}}
					onTrash={() => {
						trash.trash(preview.id);
						closePreview();
					}}
					onRestore={() => {
						trash.restore(preview.id);
						closePreview();
					}}
					onClose={closePreview}
				/>
			) : null}
		</div>
	);
};
