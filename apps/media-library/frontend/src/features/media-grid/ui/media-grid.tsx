// In scope: the listing's virtual scroll and asking for more as the end comes into view
// Out of scope: fetching the listing, how a tile looks, deciding the filter conditions
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useRef, useState } from "react";
import type { Media } from "@/shared/api";
import type { MediaList } from "../api/use-media-list.js";
import { MediaTile } from "./media-tile.js";

// A tile's minimum width and its height; the column count comes from the width, so only the width is a floor
const MIN_TILE_WIDTH = 180;
const ROW_HEIGHT = 208;
const GAP = 12;

// The scroll element's own padding, which sits between its top and the virtual container's origin
const SCROLL_PADDING = 12;

// Getting within this many rows of the end fetches the next page
const PREFETCH_ROWS = 2;

/** Lays the fetched media out in a grid and appends more as the user scrolls. */
export const MediaGrid = ({
	list,
	onSelect,
}: {
	list: MediaList;
	onSelect: (media: Media) => void;
}) => {
	const container = useRef<HTMLDivElement | null>(null);
	const [columns, setColumns] = useState(1);

	// The ref callback both keeps the scroll element and watches its width, so no effect has to
	// re-run on mount. React calls the returned cleanup when the element goes away
	const measure = useCallback((element: HTMLDivElement | null) => {
		container.current = element;

		if (!element) {
			return;
		}

		const observer = new ResizeObserver(([entry]) => {
			const width = entry?.contentRect.width ?? 0;

			setColumns(
				Math.max(1, Math.floor((width + GAP) / (MIN_TILE_WIDTH + GAP))),
			);
		});

		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, []);

	const rowCount = Math.ceil(list.items.length / columns);
	const virtualizer = useVirtualizer({
		count: rowCount,
		getScrollElement: () => {
			return container.current;
		},
		estimateSize: () => {
			return ROW_HEIGHT + GAP;
		},
		// Everything but the virtual container sits outside the scroll element, so the only thing between
		// the two origins is the padding — no measuring needed to keep the last row from being cut off
		scrollMargin: SCROLL_PADDING,
		overscan: 2,
		// Scrolling is an event, so the next page is asked for here rather than from an effect
		onChange: (instance) => {
			const lastVisibleRow = instance.getVirtualItems().at(-1)?.index ?? 0;

			if (list.hasMore && lastVisibleRow >= rowCount - PREFETCH_ROWS) {
				list.loadMore();
			}
		},
	});

	return (
		<div className="flex h-full flex-col">
			{list.error ? (
				<p role="alert" className="alert alert-error mx-3 mt-3">
					{list.error}
				</p>
			) : null}

			{list.items.length === 0 && !list.isLoading && !list.error ? (
				<p className="py-8 text-center text-base-content/60 text-sm">
					表示するメディアがありません。同期を実行すると R2
					の中身を取り込みます。
				</p>
			) : null}

			<div ref={measure} className="min-h-0 flex-1 overflow-y-auto p-3">
				<div
					className="relative w-full"
					// Both values feed the virtualizer's size estimate, so they are kept in one place
					// with it rather than split between here and a class
					style={{ height: `${virtualizer.getTotalSize()}px` }}
				>
					{virtualizer.getVirtualItems().map((row) => {
						const from = row.index * columns;

						return (
							<div
								key={row.key}
								className="absolute top-0 left-0 grid w-full"
								style={{
									height: `${ROW_HEIGHT}px`,
									gap: `${GAP}px`,
									gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
									transform: `translateY(${row.start - SCROLL_PADDING}px)`,
								}}
							>
								{list.items.slice(from, from + columns).map((media) => {
									return (
										<MediaTile
											key={media.id}
											media={media}
											onSelect={onSelect}
										/>
									);
								})}
							</div>
						);
					})}
				</div>
			</div>

			{list.isLoading ? (
				<p className="py-3 text-center text-base-content/60 text-sm">
					<span className="loading loading-dots loading-sm" />
				</p>
			) : null}
		</div>
	);
};
