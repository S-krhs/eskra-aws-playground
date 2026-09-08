// In scope: how one tile in the listing looks
// Out of scope: fetching the listing, the virtual-scroll arithmetic, filtering
import { formatByteSize, formatDuration } from "@/shared/lib/format.js";
import type { MediaItem } from "../model/use-media-page.js";

/** One item in the listing; anything without a thumbnail yet shows only its kind. */
export const MediaTile = ({ media }: { media: MediaItem }) => {
	const isVideo = media.contentType.startsWith("video/");

	return (
		<figure className="m-0 flex h-full flex-col overflow-hidden rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
			<div className="relative flex flex-1 items-center justify-center bg-slate-100 dark:bg-slate-950">
				{media.hasThumbnail ? (
					<img
						src={`/api/media/${media.id}/thumbnail`}
						alt={media.fileName}
						loading="lazy"
						className="size-full object-contain"
					/>
				) : (
					<span className="text-slate-500 text-xs">
						{isVideo ? "動画" : "画像"}(サムネイル生成待ち)
					</span>
				)}
				{isVideo && media.durationMs !== undefined ? (
					<span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 font-mono text-[11px] text-white">
						{formatDuration(media.durationMs)}
					</span>
				) : null}
			</div>
			<figcaption className="border-slate-200 border-t px-2 py-1 dark:border-slate-800">
				<p className="truncate text-xs" title={media.fileName}>
					{media.fileName}
				</p>
				<p className="font-mono text-[11px] text-slate-500">
					{formatByteSize(media.byteSize)}
				</p>
			</figcaption>
		</figure>
	);
};
