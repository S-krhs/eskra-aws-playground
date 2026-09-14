// In scope: which of the listed media are selected, and widening that across a range
// Out of scope: acting on what is selected, fetching the listing, rendering
import { useState } from "react";
import { pickRange } from "../lib/range-selection.js";

export interface MediaSelection {
	/** The selected media the listing shows right now. */
	selectedIds: ReadonlySet<string>;
	/** With `isRange`, everything from the last one toggled through this one is selected instead. */
	toggle: (mediaId: string, isRange: boolean) => void;
	selectAll: () => void;
	clear: () => void;
	/** Drops ids from whatever is selected when it runs, so it can be handed to something that finishes later. */
	deselect: (mediaIds: string[]) => void;
}

/** `listedIds` is the listing in its own order, which a range follows. */
export const useMediaSelection = (listedIds: string[]): MediaSelection => {
	// Not pruned when an id leaves the listing, only left out of `selectedIds`: the listing blanks while a
	// new query key loads, and pruning then would come back with the selection wiped
	const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
	const [anchorId, setAnchorId] = useState<string | null>(null);
	const selectedIds = new Set(
		listedIds.filter((id) => {
			return picked.has(id);
		}),
	);

	return {
		selectedIds,
		toggle: (mediaId, isRange) => {
			const range =
				isRange && anchorId !== null
					? pickRange(listedIds, anchorId, mediaId)
					: undefined;

			setPicked((current) => {
				const next = new Set(current);

				if (range) {
					for (const id of range) {
						next.add(id);
					}
				} else if (next.has(mediaId)) {
					next.delete(mediaId);
				} else {
					next.add(mediaId);
				}

				return next;
			});
			setAnchorId(mediaId);
		},
		selectAll: () => {
			setPicked((current) => {
				return new Set([...current, ...listedIds]);
			});
		},
		clear: () => {
			setPicked(new Set());
			setAnchorId(null);
		},
		deselect: (mediaIds) => {
			setPicked((current) => {
				const next = new Set(current);

				for (const id of mediaIds) {
					next.delete(id);
				}

				return next;
			});
		},
	};
};
