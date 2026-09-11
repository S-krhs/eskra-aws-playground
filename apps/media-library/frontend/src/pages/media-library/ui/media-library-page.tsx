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
		<div className="flex h-dvh flex-col bg-base-200 text-base-content">
			<header className="flex flex-wrap items-center justify-between gap-3 border-base-300 border-b bg-base-100 px-3 py-2">
				<MediaFilterBar
					filter={filter}
					tags={tagSuggestions}
					folders={folderSuggestions}
					onChange={setFilter}
				/>
				<SyncControl status={status} />
			</header>
			{trash.status.kind === "failed" ? (
				<p role="alert" className="alert alert-error mx-3 mt-3">
					{trash.status.message}
				</p>
			) : null}
			<main className="min-h-0 flex-1">
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
