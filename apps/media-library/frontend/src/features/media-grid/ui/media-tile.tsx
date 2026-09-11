// In scope: how one tile in the listing looks, and that it opens the media it stands for
// Out of scope: fetching the listing, the virtual-scroll arithmetic, filtering, the preview itself
import { getGetThumbnailUrl, type Media } from "@/shared/api";
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
			className="flex h-full flex-col overflow-hidden rounded-xs border border-base-300 bg-base-100 text-left transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
		>
			<span className="relative flex min-h-0 flex-1 items-center justify-center bg-base-200">
				{media.hasThumbnail ? (
					<img
						src={getGetThumbnailUrl(media.id)}
						alt={media.fileName}
						loading="lazy"
						className="size-full object-cover"
					/>
				) : (
					<span className="text-base-content/40 text-xs">
						{isVideo ? "動画" : "画像"}
					</span>
				)}
				{media.durationMs === undefined ? null : (
					// A plain chip rather than a badge: a pill over a square thumbnail reads as a stray blob
					<span className="absolute right-1 bottom-1 rounded-xs bg-neutral/85 px-1 py-0.5 font-mono text-[11px] text-neutral-content">
						{formatDuration(media.durationMs)}
					</span>
				)}
			</span>
			<span className="block w-full shrink-0 border-base-300 border-t px-2 py-1.5">
				<span className="block truncate text-xs" title={media.fileName}>
					{media.fileName}
				</span>
				<span className="block text-[11px] text-base-content/50">
					{formatByteSize(media.byteSize)}
				</span>
			</span>
		</button>
	);
};
