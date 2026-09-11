// In scope: how one tile in the listing looks, and that it opens the media it stands for
// Out of scope: fetching the listing, the virtual-scroll arithmetic, filtering, the preview itself
import { buildThumbnailUrl, type Media } from "@/shared/api";
import { formatByteSize, formatDuration } from "@/shared/lib";

/**
 * One item in the listing; anything without a thumbnail yet shows only its kind.
 * A button rather than a figure, because the whole tile is what opens the media.
 */
export const MediaTile = ({
	media,
	onSelect,
}: {
	media: Media;
	onSelect: (media: Media) => void;
}) => {
	const isVideo = media.contentType.startsWith("video/");

	return (
		<button
			type="button"
			onClick={() => {
				onSelect(media);
			}}
			className="card m-0 h-full overflow-hidden border border-base-300 bg-base-100 text-left"
		>
			<span className="relative flex flex-1 items-center justify-center bg-base-200">
				{media.hasThumbnail ? (
					<img
						src={buildThumbnailUrl(media.id)}
						alt={media.fileName}
						loading="lazy"
						className="size-full object-cover"
					/>
				) : (
					<span className="text-base-content/50 text-xs">
						{isVideo ? "動画" : "画像"}
					</span>
				)}
				{media.durationMs === undefined ? null : (
					<span className="badge badge-neutral badge-sm absolute right-1 bottom-1 font-mono">
						{formatDuration(media.durationMs)}
					</span>
				)}
			</span>
			<span className="block w-full px-2 py-1">
				<span className="block truncate text-xs" title={media.fileName}>
					{media.fileName}
				</span>
				<span className="block text-base-content/60 text-xs">
					{formatByteSize(media.byteSize)}
				</span>
			</span>
		</button>
	);
};
