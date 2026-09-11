// In scope: showing one media object's original, its details, and the way to save it
// Out of scope: deciding which one is open, fetching the listing, editing anything about it
import { useCallback } from "react";
import type { Media } from "@/shared/api";
import {
	buildMediaFileUrl,
	formatByteSize,
	formatDateTime,
	formatDuration,
} from "@/shared/lib";

/** Everything about the media worth reading beside it, in the order it reads best. */
const toDetails = (media: Media): { label: string; value: string }[] => {
	return [
		{ label: "フォルダ", value: media.logicalPath || "(未整理)" },
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

/** The original itself, read straight from the backend — a video plays in place and seeks over Range. */
export const MediaPreviewDialog = ({
	media,
	onClose,
}: {
	media: Media;
	onClose: () => void;
}) => {
	// showModal() is what puts a <dialog> in the top layer, where Esc closes it and the rest of the
	// screen stops taking focus; the open attribute alone does neither. Called from the ref callback so
	// no effect has to run on mount
	const openModal = useCallback((element: HTMLDialogElement | null) => {
		element?.showModal();
	}, []);
	const fileUrl = buildMediaFileUrl(media.id);

	return (
		<dialog ref={openModal} className="modal" onClose={onClose}>
			<div className="modal-box max-w-5xl">
				<h3 className="truncate font-bold text-lg" title={media.fileName}>
					{media.fileName}
				</h3>

				<div className="mt-3 flex justify-center bg-base-200">
					{media.contentType.startsWith("video/") ? (
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

				<div className="modal-action">
					<a
						href={buildMediaFileUrl(media.id, { download: true })}
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
