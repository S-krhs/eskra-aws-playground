// In scope: how one tile in the listing looks, and that it opens or selects the media it stands for
// Out of scope: fetching the listing, the virtual-scroll arithmetic, filtering, holding the selection, the preview itself
import { getGetThumbnailUrl, type Media } from "@/shared/api";
import { formatByteSize, formatDuration } from "@/shared/lib";

/**
 * Anything without a thumbnail yet shows only its kind.
 * A button rather than a figure, because the whole tile is what opens the media — or, once anything is
 * selected, what selects it, so a run of tiles can be picked without aiming at each checkbox.
 */
export const MediaTile = ({
	media,
	isSelected,
	isSelecting,
	onOpen,
	onToggle,
}: {
	media: Media;
	isSelected: boolean;
	/** Whether anything in the listing is selected. */
	isSelecting: boolean;
	onOpen: (media: Media) => void;
	onToggle: (mediaId: string, isRange: boolean) => void;
}) => {
	const isVideo = media.contentType.startsWith("video/");

	return (
		// The checkbox sits beside the button rather than inside it: a button can't hold another control.
		// min-h-0 because a grid item's automatic minimum is its content: the image would stretch the row
		// past its fixed height into the next one
		<div className="group relative h-full min-h-0 select-none">
			<button
				type="button"
				onClick={(event) => {
					if (isSelecting) {
						onToggle(media.id, event.shiftKey);
						return;
					}

					onOpen(media);
				}}
				className={`flex size-full flex-col overflow-hidden rounded-xs border bg-base-100 text-left transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary ${isSelected ? "border-primary ring-2 ring-primary" : "border-base-300"}`}
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
			<input
				type="checkbox"
				aria-label={`${media.fileName} を選択`}
				checked={isSelected}
				onChange={(event) => {
					// A checkbox's change is fired by the click itself, which is the only place Shift can be read from
					const { nativeEvent } = event;

					onToggle(
						media.id,
						nativeEvent instanceof MouseEvent && nativeEvent.shiftKey,
					);
				}}
				// daisyUI's checkbox sits in a layer nested inside utilities, so a plain utility beats it: a
				// background left on while checked hides the fill and the white tick. The theme's round
				// selector radius would read as a radio button, hence rounded-xs.
				// A pointer that can't hover would never reveal it, so it always shows there
				className={`checkbox checkbox-primary checkbox-sm absolute top-1.5 left-1.5 rounded-xs not-checked:bg-base-100 ${isSelecting ? "" : "opacity-0 pointer-coarse:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"}`}
			/>
		</div>
	);
};
