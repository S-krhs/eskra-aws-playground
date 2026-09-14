// In scope: which tags narrow the listing, and which ones the tag search leaves on offer
// Out of scope: rendering the buttons, fetching the tags in use, the rest of the filter
import { useState } from "react";
import type { MediaFilter } from "@/entities/media";
import type { TagUsage } from "@/shared/api";

export interface TagFilter {
	selectedTags: string[];
	/**
	 * Every selected tag is included whether the search matches it or not, even once nothing carries it —
	 * its button is the only way to turn it back off.
	 * Nothing caps how many are picked: a tag is only on offer while some media carries it alongside every
	 * one already picked, and no media carries more tags than a listing can be narrowed by.
	 */
	offeredTags: TagUsage[];
	query: string;
	setQuery: (query: string) => void;
	toggle: (tag: string) => void;
	clear: () => void;
}

export const useTagFilter = (input: {
	tags: TagUsage[];
	filter: MediaFilter;
	onChange: (update: (filter: MediaFilter) => MediaFilter) => void;
}): TagFilter => {
	// Only narrows which buttons are offered; the listing never sees it
	const [query, setQuery] = useState("");
	const selectedTags = input.filter.tags ?? [];
	const needle = query.trim().toLowerCase();

	return {
		selectedTags,
		// Selected ones aren't moved to the front, so a button doesn't jump away from under the pointer
		offeredTags: [
			...input.tags,
			...selectedTags
				.filter((name) => {
					return !input.tags.some((tag) => {
						return tag.name === name;
					});
				})
				.map((name) => {
					return { name, mediaCount: 0 };
				}),
		].filter((tag) => {
			return (
				selectedTags.includes(tag.name) ||
				tag.name.toLowerCase().includes(needle)
			);
		}),
		query,
		setQuery,
		toggle: (tag) => {
			input.onChange((current) => {
				const selected = current.tags ?? [];
				const next = selected.includes(tag)
					? selected.filter((kept) => {
							return kept !== tag;
						})
					: [...selected, tag];

				return { ...current, tags: next.length === 0 ? undefined : next };
			});
		},
		clear: () => {
			input.onChange((current) => {
				return { ...current, tags: undefined };
			});
		},
	};
};
