// In scope: how one tile in the listing looks
// Out of scope: fetching the listing, the virtual-scroll arithmetic, filtering
import type { Media } from "@/shared/api";
import { formatByteSize, formatDuration } from "@/shared/lib/format.js";

/** One item in the listing; anything without a thumbnail yet shows only its kind. */
export const MediaTile = ({ media }: { media: Media }) => {
	const isVideo = media.contentType.startsWith("video/");

	return (
		<figure className="card m-0 h-full overflow-hidden border border-base-300 bg-base-100">
			<div className="relative flex flex-1 items-center justify-center bg-base-200">
				{media.hasThumbnail ? (
					<img
						src={`/api/media/${media.id}/thumbnail`}
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
			</div>
			<figcaption className="px-2 py-1">
				<p className="truncate text-xs" title={media.fileName}>
					{media.fileName}
				</p>
				<p className="text-base-content/60 text-xs">
					{formatByteSize(media.byteSize)}
				</p>
			</figcaption>
		</figure>
	);
};
