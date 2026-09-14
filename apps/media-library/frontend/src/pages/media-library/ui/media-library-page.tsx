// In scope: assembling the filter, listing, selection, preview, trash and sync features into one screen,
//           and the words each of them reports itself with
// Out of scope: each feature's implementation, calling the API, formatting
import { MediaFilterBar } from "@/features/media-filter";
import { MediaGrid } from "@/features/media-grid";
import { MediaPreviewDialog } from "@/features/media-preview";
import {
	MediaSelectionBar,
	type SelectionAction,
	type SelectionRunStatus,
} from "@/features/media-selection";
import { SyncControl } from "@/features/sync-control";
import { useMediaLibrary } from "../model/use-media-library.js";

const RUN_WORDS: Record<
	SelectionAction,
	{ doing: string; done: string; failed: string }
> = {
	move: {
		doing: "移しています",
		done: "移しました",
		failed: "移せませんでした",
	},
	trash: {
		doing: "ゴミ箱へ入れています",
		done: "ゴミ箱へ入れました",
		failed: "ゴミ箱へ入れられませんでした",
	},
	restore: {
		doing: "元に戻しています",
		done: "元に戻しました",
		failed: "元に戻せませんでした",
	},
};

const describeRun = (status: SelectionRunStatus): string | undefined => {
	switch (status.kind) {
		case "idle":
			return undefined;
		case "pending":
			return `${status.settledCount} / ${status.totalCount} 件を${RUN_WORDS[status.action].doing}…`;
		case "done":
			return `${status.totalCount} 件を${RUN_WORDS[status.action].done}`;
		case "failed":
			return `${status.totalCount} 件のうち ${status.failedCount} 件を${RUN_WORDS[status.action].failed}: ${status.message}`;
	}
};

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
		selection,
		selectionActions,
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
				<MediaGrid
					list={list}
					selectedIds={selection.selectedIds}
					onOpen={openPreview}
					onToggle={selection.toggle}
					toolbar={
						<MediaSelectionBar
							selectedCount={selection.selectedIds.size}
							listedCount={list.items.length}
							state={filter.state ?? "filed"}
							folderSuggestions={folderSuggestions}
							isBusy={selectionActions.status.kind === "pending"}
							message={describeRun(selectionActions.status)}
							onSelectAll={selection.selectAll}
							onClear={selection.clear}
							// What went through is let go of, so a failure is left selected to try again
							onMove={(logicalPath) => {
								selectionActions.move(
									[...selection.selectedIds],
									logicalPath,
									selection.deselect,
								);
							}}
							onTrash={() => {
								selectionActions.trash(
									[...selection.selectedIds],
									selection.deselect,
								);
							}}
							onRestore={() => {
								selectionActions.restore(
									[...selection.selectedIds],
									selection.deselect,
								);
							}}
						/>
					}
				/>
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
