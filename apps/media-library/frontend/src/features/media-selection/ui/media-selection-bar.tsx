// In scope: the controls acting on the selected media — how many there are, and filing, trashing or restoring them
// Out of scope: holding the selection, sending the requests, the words for how a run is going
import { useState } from "react";
import type { ListMediaState } from "@/shared/api";
import { ClearInputButton } from "@/shared/ui";

/** `message` stays once the selection has emptied, so how the run ended still reads. */
export const MediaSelectionBar = ({
	selectedCount,
	listedCount,
	hasMore,
	state,
	folderSuggestions,
	archiveFolderSuggestions,
	isBusy,
	message,
	onSelectAll,
	onClear,
	onMove,
	onTrash,
	onRestore,
}: {
	selectedCount: number;
	listedCount: number;
	/** The listing goes on past what has been read in, and selecting all takes only what has. */
	hasMore: boolean;
	state: ListMediaState;
	folderSuggestions: string[];
	/** Offered in place of `folderSuggestions` while the archive is ticked. */
	archiveFolderSuggestions: string[];
	/** Holds back only the actions; selecting stays open during a run. */
	isBusy: boolean;
	message: string | undefined;
	onSelectAll: () => void;
	onClear: () => void;
	/** An empty path takes the media back out of every folder; `isArchived` files it into the archive instead. */
	onMove: (logicalPath: string, isArchived: boolean) => void;
	onTrash: () => void;
	onRestore: () => void;
}) => {
	const [folder, setFolder] = useState("");
	// Starts ticked inside the archive, where moving media along to another of its folders is the likely aim
	const [isArchived, setIsArchived] = useState(state === "archived");
	const logicalPath = folder.trim();

	return (
		<div className="flex flex-wrap items-center justify-end gap-2">
			{message ? (
				<p className="text-base-content/60 text-xs">{message}</p>
			) : null}
			{selectedCount < listedCount ? (
				<button
					type="button"
					onClick={onSelectAll}
					className="btn btn-ghost btn-sm rounded-full"
				>
					{hasMore
						? `読み込み済みの ${listedCount} 件を選択`
						: `${listedCount} 件をすべて選択`}
				</button>
			) : null}
			{selectedCount === 0 ? null : (
				<>
					<p className="font-medium text-xs">{selectedCount} 件を選択中</p>
					<button
						type="button"
						onClick={onClear}
						className="btn btn-ghost btn-sm rounded-full"
					>
						選択を解除
					</button>
					{state === "trashed" ? (
						<button
							type="button"
							disabled={isBusy}
							onClick={onRestore}
							className="btn btn-sm rounded-full"
						>
							ゴミ箱から戻す
						</button>
					) : (
						<>
							<label className="input input-sm w-40 pe-1">
								<input
									type="text"
									list="media-selection-folders"
									aria-label="移すフォルダ"
									placeholder={
										isArchived
											? "アーカイブのフォルダ"
											: state === "inbox"
												? "移すフォルダ"
												: "空欄で未整理へ"
									}
									value={folder}
									onChange={(event) => {
										setFolder(event.target.value);
									}}
								/>
								{folder === "" ? null : (
									<ClearInputButton
										label="フォルダの入力を消す"
										onClick={() => {
											setFolder("");
										}}
									/>
								)}
							</label>
							<datalist id="media-selection-folders">
								{(isArchived
									? archiveFolderSuggestions
									: folderSuggestions
								).map((path) => {
									return <option key={path} value={path} />;
								})}
							</datalist>
							<label className="label gap-1.5 text-base-content text-xs">
								<input
									type="checkbox"
									checked={isArchived}
									onChange={(event) => {
										setIsArchived(event.target.checked);
									}}
									className="checkbox checkbox-xs"
								/>
								アーカイブ
							</label>
							<button
								type="button"
								// On the inbox side an empty path would file each media where it already sits, and the
								// archive holds folders only
								disabled={
									isBusy ||
									(logicalPath === "" && (isArchived || state === "inbox"))
								}
								onClick={() => {
									onMove(logicalPath, isArchived);
								}}
								className="btn btn-sm rounded-full"
							>
								移す
							</button>
							<button
								type="button"
								disabled={isBusy}
								onClick={onTrash}
								className="btn btn-sm rounded-full"
							>
								ゴミ箱へ
							</button>
						</>
					)}
				</>
			)}
		</div>
	);
};
