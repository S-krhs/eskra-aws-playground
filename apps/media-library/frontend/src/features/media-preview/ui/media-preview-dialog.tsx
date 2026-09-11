// In scope: showing one media object's original, its details, and the way to save it
// Out of scope: deciding which one is open, fetching the listing, editing anything about it
import { useCallback, useState } from "react";
import { getGetMediaFileUrl, type Media } from "@/shared/api";
import { formatByteSize, formatDateTime, formatDuration } from "@/shared/lib";

const SECTION_TITLE_CLASS = "font-medium text-base-content/60 text-xs";

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
	const fileUrl = getGetMediaFileUrl(media.id);
	// A video has no single picture to hand the browser's clipboard, so only the file copy is offered
	const isVideo = media.contentType.startsWith("video/");

	return (
		<dialog ref={openModal} className="modal" onClose={onClose}>
			{/* Padding is dropped so the header, the media, the details and the actions can each own their
			    own edge; the media then takes every pixel the other three leave */}
			<div className="modal-box flex h-[92dvh] w-[94vw] max-w-[96rem] flex-col overflow-hidden p-0">
				<header className="flex shrink-0 items-center gap-2 border-base-300 border-b px-3 py-2">
					<h2
						className="min-w-0 flex-1 truncate font-bold text-sm"
						title={media.fileName}
					>
						{media.fileName}
					</h2>
					<form method="dialog">
						<button
							type="submit"
							aria-label="閉じる"
							className="btn btn-ghost btn-sm rounded-full"
						>
							✕
						</button>
					</form>
				</header>

				<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
					{/* Dark behind the original: the theme's light ground washes a photo out and hides where it ends */}
					<div className="flex min-h-0 flex-1 items-center justify-center bg-neutral p-2">
						{isVideo ? (
							// biome-ignore lint/a11y/useMediaCaption: personal media taken in from a folder, with no caption track to point at
							<video
								src={fileUrl}
								controls
								preload="metadata"
								className="max-h-full max-w-full"
							/>
						) : (
							<img
								src={fileUrl}
								alt={media.fileName}
								className="max-h-full max-w-full object-contain"
							/>
						)}
					</div>

					<aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-base-300 border-t bg-base-100 p-3 lg:w-80 lg:border-t-0 lg:border-l">
						<section className="flex flex-col gap-1.5">
							<h3 className={SECTION_TITLE_CLASS}>フォルダ</h3>
							<div className="flex gap-1.5">
								<input
									type="text"
									list="media-folder-suggestions"
									aria-label="フォルダ"
									placeholder="未整理"
									value={folder}
									disabled={isTrashed}
									onChange={(event) => {
										setFolder(event.target.value);
									}}
									className="input input-sm min-w-0 flex-1"
								/>
								<datalist id="media-folder-suggestions">
									{folderSuggestions.map((path) => {
										return <option key={path} value={path} />;
									})}
								</datalist>
								<button
									type="button"
									disabled={isTrashed || folder.trim() === media.logicalPath}
									onClick={() => {
										onMove(folder.trim());
									}}
									className="btn btn-sm rounded-full"
								>
									移す
								</button>
							</div>
							{isTrashed ? (
								<p className="text-base-content/60 text-xs">
									ゴミ箱にある間は整理できません
								</p>
							) : null}
						</section>

						<section className="flex flex-col gap-1.5">
							<h3 className={SECTION_TITLE_CLASS}>タグ</h3>
							{tags.length === 0 ? null : (
								<div className="flex flex-wrap items-center gap-1">
									{tags.map((tag) => {
										return (
											<span
												key={tag}
												className="badge badge-outline badge-sm gap-1"
											>
												{tag}
												<button
													type="button"
													aria-label={`${tag} を外す`}
													disabled={isTrashed}
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
								</div>
							)}
							<input
								type="text"
								list="media-tag-suggestions"
								aria-label="タグを追加"
								placeholder="Enter で追加"
								value={draft}
								disabled={isTrashed}
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
								className="input input-sm w-full"
							/>
							<datalist id="media-tag-suggestions">
								{tagSuggestions.map((tag) => {
									return <option key={tag} value={tag} />;
								})}
							</datalist>
						</section>

						<section className="flex flex-col gap-1.5">
							<h3 className={SECTION_TITLE_CLASS}>詳細</h3>
							<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
								{toDetails(media).map((detail) => {
									return (
										<div key={detail.label} className="contents">
											<dt className="text-base-content/60">{detail.label}</dt>
											<dd className="truncate" title={detail.value}>
												{detail.value}
											</dd>
										</div>
									);
								})}
							</dl>
						</section>
					</aside>
				</div>

				<footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-base-300 border-t px-3 py-2">
					{message ? (
						<p className="mr-auto text-base-content/60 text-xs">{message}</p>
					) : null}
					{isVideo ? null : (
						<button
							type="button"
							onClick={onCopyImage}
							className="btn btn-sm rounded-full"
						>
							画像としてコピー
						</button>
					)}
					<button
						type="button"
						onClick={onCopyFile}
						className="btn btn-sm rounded-full"
					>
						ファイルとしてコピー
					</button>
					{isTrashed ? (
						<button
							type="button"
							onClick={onRestore}
							className="btn btn-sm rounded-full"
						>
							元に戻す
						</button>
					) : (
						<button
							type="button"
							onClick={onTrash}
							className="btn btn-sm rounded-full"
						>
							ゴミ箱へ
						</button>
					)}
					<a
						href={getGetMediaFileUrl(media.id, { download: "1" })}
						download={media.fileName}
						className="btn btn-primary btn-sm rounded-full"
					>
						ダウンロード
					</a>
				</footer>
			</div>

			{/* The backdrop is a form of its own so clicking outside closes the dialog the same way */}
			<form method="dialog" className="modal-backdrop">
				<button type="submit">閉じる</button>
			</form>
		</dialog>
	);
};
