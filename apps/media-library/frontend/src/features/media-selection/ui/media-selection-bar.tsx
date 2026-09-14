// In scope: the controls acting on the selected media — how many there are, and filing, trashing or restoring them
// Out of scope: holding the selection, sending the requests, the words for how a run is going
import { useState } from "react";
import type { ListMediaState } from "@/shared/api";

/** `message` stays once the selection has emptied, so how the run ended still reads. */
export const MediaSelectionBar = ({
	selectedCount,
	listedCount,
	state,
	folderSuggestions,
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
	state: ListMediaState;
	folderSuggestions: string[];
	/** Holds back only the actions; selecting stays open during a run. */
	isBusy: boolean;
	message: string | undefined;
	onSelectAll: () => void;
	onClear: () => void;
	/** An empty path takes the media back out of every folder. */
	onMove: (logicalPath: string) => void;
	onTrash: () => void;
	onRestore: () => void;
}) => {
	const [folder, setFolder] = useState("");
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
					{listedCount} 件をすべて選択
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
							元に戻す
						</button>
					) : (
						<>
							<input
								type="text"
								list="media-selection-folders"
								aria-label="移すフォルダ"
								placeholder={
									state === "inbox" ? "移すフォルダ" : "空欄で未整理へ"
								}
								value={folder}
								onChange={(event) => {
									setFolder(event.target.value);
								}}
								className="input input-sm w-40"
							/>
							<datalist id="media-selection-folders">
								{folderSuggestions.map((path) => {
									return <option key={path} value={path} />;
								})}
							</datalist>
							<button
								type="button"
								// On the inbox side an empty path would file each media where it already sits
								disabled={isBusy || (state === "inbox" && logicalPath === "")}
								onClick={() => {
									onMove(logicalPath);
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
