// In scope: reading the tags in use, for the screen to offer them to pick from
// Out of scope: tagging a media object, filtering the listing, rendering
import { useListTags } from "@/shared/api";

/**
 * The tag names in use, by name.
 * Empty while the first read is in flight and where nothing is tagged — a picker reads the same either
 * way, so the two aren't told apart here.
 */
export const useTagList = (): string[] => {
	const query = useListTags();

	return query.data?.status === 200 ? query.data.data.tags : [];
};
