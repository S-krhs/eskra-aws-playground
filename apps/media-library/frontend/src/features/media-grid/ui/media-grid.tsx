// In scope: the listing's virtual scroll and asking for more as the end comes into view
// Out of scope: fetching the listing, how a tile looks, deciding the filter conditions
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MediaPage } from "../model/use-media-page.js";
import { MediaTile } from "./media-tile.js";

// A tile's minimum width and its height; the column count comes from the width, so only the width is a floor
const MIN_TILE_WIDTH = 180;
const ROW_HEIGHT = 208;
const GAP = 12;

// Getting within this many rows of the end fetches the next page
const PREFETCH_ROWS = 2;

const useColumnCount = (
	container: React.RefObject<HTMLDivElement | null>,
): number => {
	const [columns, setColumns] = useState(1);

	useLayoutEffect(() => {
		const element = container.current;

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
	}, [container]);

	return columns;
};

/** Lays the fetched media out in a grid and appends more as the user scrolls. */
export const MediaGrid = ({ page }: { page: MediaPage }) => {
	const container = useRef<HTMLDivElement>(null);
	const columns = useColumnCount(container);
	const rowCount = Math.ceil(page.items.length / columns);

	const virtualizer = useVirtualizer({
		count: rowCount,
		getScrollElement: () => {
			return container.current;
		},
		estimateSize: () => {
			return ROW_HEIGHT + GAP;
		},
		overscan: 2,
	});

	const virtualRows = virtualizer.getVirtualItems();
	const lastVisibleRow = virtualRows.at(-1)?.index ?? 0;

	useEffect(() => {
		if (page.hasMore && lastVisibleRow >= rowCount - PREFETCH_ROWS) {
			page.loadMore();
		}
	}, [page, lastVisibleRow, rowCount]);

	return (
		<div ref={container} className="h-full overflow-y-auto p-3">
			{page.error ? (
				<p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-red-800 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-200">
					{page.error}
				</p>
			) : null}

			{page.items.length === 0 && !page.isLoading && !page.error ? (
				<p className="py-8 text-center text-slate-500 text-sm">
					表示するメディアがありません。同期を実行すると R2
					の中身を取り込みます。
				</p>
			) : null}

			<div
				className="relative w-full"
				style={{ height: `${virtualizer.getTotalSize()}px` }}
			>
				{virtualRows.map((row) => {
					const from = row.index * columns;

					return (
						<div
							key={row.key}
							className="absolute top-0 left-0 grid w-full"
							style={{
								height: `${ROW_HEIGHT}px`,
								gap: `${GAP}px`,
								gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
								transform: `translateY(${row.start}px)`,
							}}
						>
							{page.items.slice(from, from + columns).map((media) => {
								return <MediaTile key={media.id} media={media} />;
							})}
						</div>
					);
				})}
			</div>

			{page.isLoading ? (
				<p className="py-3 text-center text-slate-500 text-sm">読み込み中…</p>
			) : null}
		</div>
	);
};
