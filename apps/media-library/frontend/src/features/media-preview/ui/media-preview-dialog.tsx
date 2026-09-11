// In scope: showing one media object's original, its details, and the way to save it
// Out of scope: deciding which one is open, fetching the listing, editing anything about it
import { useCallback, useState } from "react";
import { buildMediaFileUrl, type Media } from "@/shared/api";
import { formatByteSize, formatDateTime, formatDuration } from "@/shared/lib";

/** Everything about the media worth reading beside it, in the order it reads best. */
const toDetails = (media: Media): { label: string; value: string }[] => {
	return [
		{ label: "種別", value: media.contentType },
		{ label: "サイズ", value: formatByteSize(media.byteSize) },
		...(media.width !== undefined && media.height !== undefined
			? [{ label: "寸法", value: `${media.width} × ${media.height}` }]
			: []),
		...(media.durationMs !== undefined
			? [{ label: "長さ", value: formatDuration(media.durationMs) }]
			: []),
		{ label: "取り込み", value: formatDateTime(media.uploadedAt) },
	];
};

/**
 * The original itself, read straight from the backend — a video plays in place and seeks over Range.
 * `isTrashed` says which of the two trash moves to offer; the caller knows which side it is listing.
 * `message` is shown as it stands: copying and saving give no sign of themselves otherwise.
 */
export const MediaPreviewDialog = ({
	media,
	isTrashed,
	tagSuggestions,
	folderSuggestions,
	message,
	onChangeTags,
	onMove,
	onCopyImage,
	onCopyFile,
	onTrash,
	onRestore,
	onClose,
}: {
	media: Media;
	isTrashed: boolean;
	/** The tags already in use, offered as completions while typing a new one. */
	tagSuggestions: string[];
	/** The folders there are, offered the same way. A folder not among them is made by moving into it. */
	folderSuggestions: string[];
	message: string | undefined;
	onChangeTags: (tags: string[]) => void;
	/** An empty path takes the media back out of every folder. */
	onMove: (logicalPath: string) => void;
	onCopyImage: () => void;
	onCopyFile: () => void;
	onTrash: () => void;
	onRestore: () => void;
	onClose: () => void;
}) => {
	// showModal() is what puts a <dialog> in the top layer, where Esc closes it and the rest of the
	// screen stops taking focus; the open attribute alone does neither. Called from the ref callback so
	// no effect has to run on mount
	const openModal = useCallback((element: HTMLDialogElement | null) => {
		element?.showModal();
	}, []);
	// What the media carries is held here while it is edited, so a chip appears the moment it is added
	// rather than once the listing has been read again. The dialog is gone by the next open
	const [tags, setTags] = useState(media.tags);
	const [draft, setDraft] = useState("");
	// Where the media is being filed, held while it is typed. A move answers with where it landed, but
	// what is in the field is what the user is still working on
	const [folder, setFolder] = useState(media.logicalPath);
	const changeTags = (next: string[]) => {
		setTags(next);
		onChangeTags(next);
	};
	const addDraftTag = () => {
		const name = draft.trim();
		setDraft("");

		if (name !== "" && !tags.includes(name)) {
			changeTags([...tags, name]);
		}
	};
	const fileUrl = buildMediaFileUrl(media.id);
	// A video has no single picture to hand the browser's clipboard, so only the file copy is offered
	const isVideo = media.contentType.startsWith("video/");

	return (
		<dialog ref={openModal} className="modal" onClose={onClose}>
			<div className="modal-box max-w-5xl">
				<h3 className="truncate font-bold text-lg" title={media.fileName}>
					{media.fileName}
				</h3>

				<div className="mt-3 flex justify-center bg-base-200">
					{isVideo ? (
						// biome-ignore lint/a11y/useMediaCaption: personal media taken in from a folder, with no caption track to point at
						<video
							src={fileUrl}
							controls
							preload="metadata"
							className="max-h-[70vh]"
						/>
					) : (
						<img
							src={fileUrl}
							alt={media.fileName}
							className="max-h-[70vh] object-contain"
						/>
					)}
				</div>

				<div className="mt-3 flex flex-wrap items-center gap-2">
					<span className="text-base-content/60 text-xs">フォルダ</span>
					<input
						type="text"
						list="media-folder-suggestions"
						aria-label="フォルダ"
						placeholder="未整理"
						value={folder}
						onChange={(event) => {
							setFolder(event.target.value);
						}}
						className="input input-xs w-64"
					/>
					<datalist id="media-folder-suggestions">
						{folderSuggestions.map((path) => {
							return <option key={path} value={path} />;
						})}
					</datalist>
					<button
						type="button"
						disabled={folder.trim() === media.logicalPath}
						onClick={() => {
							onMove(folder.trim());
						}}
						className="btn btn-xs"
					>
						移す
					</button>
				</div>

				<div className="mt-3 flex flex-wrap items-center gap-1">
					<span className="text-base-content/60 text-xs">タグ</span>
					{tags.map((tag) => {
						return (
							<span key={tag} className="badge badge-outline gap-1">
								{tag}
								<button
									type="button"
									aria-label={`${tag} を外す`}
									onClick={() => {
										changeTags(
											tags.filter((kept) => {
												return kept !== tag;
											}),
										);
									}}
								>
									×
								</button>
							</span>
						);
					})}
					<input
						type="text"
						list="media-tag-suggestions"
						aria-label="タグを追加"
						placeholder="タグを追加"
						value={draft}
						onChange={(event) => {
							setDraft(event.target.value);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								// Nothing here submits, but Enter in a dialog closes it unless it is stopped
								event.preventDefault();
								addDraftTag();
							}
						}}
						onBlur={addDraftTag}
						className="input input-xs w-32"
					/>
					<datalist id="media-tag-suggestions">
						{tagSuggestions.map((tag) => {
							return <option key={tag} value={tag} />;
						})}
					</datalist>
				</div>

				<dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 text-sm">
					{toDetails(media).map((detail) => {
						return (
							<div key={detail.label} className="contents">
								<dt className="text-base-content/60">{detail.label}</dt>
								<dd className="truncate">{detail.value}</dd>
							</div>
						);
					})}
				</dl>

				<div className="modal-action flex-wrap items-center">
					{message ? (
						<p className="mr-auto text-base-content/60 text-xs">{message}</p>
					) : null}
					{isVideo ? null : (
						<button type="button" onClick={onCopyImage} className="btn btn-sm">
							画像としてコピー
						</button>
					)}
					<button type="button" onClick={onCopyFile} className="btn btn-sm">
						ファイルとしてコピー
					</button>
					{isTrashed ? (
						<button type="button" onClick={onRestore} className="btn btn-sm">
							元に戻す
						</button>
					) : (
						<button type="button" onClick={onTrash} className="btn btn-sm">
							ゴミ箱へ
						</button>
					)}
					<a
						href={buildMediaFileUrl(media.id, { download: "1" })}
						download={media.fileName}
						className="btn btn-primary btn-sm"
					>
						ダウンロード
					</a>
					<form method="dialog">
						<button type="submit" className="btn btn-sm">
							閉じる
						</button>
					</form>
				</div>
			</div>

			{/* The backdrop is a form of its own so clicking outside closes the dialog the same way */}
			<form method="dialog" className="modal-backdrop">
				<button type="submit">閉じる</button>
			</form>
		</dialog>
	);
};
