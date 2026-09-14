// In scope: reading the tags in use and how many media carry each, for the screen to offer them to pick from
// Out of scope: tagging a media object, filtering the listing, rendering
import { keepPreviousData } from "@tanstack/react-query";
import type { MediaFilter } from "@/entities/media";
import {
	getListTagsQueryKey,
	type ListTagsParams,
	type TagUsage,
	useListTags,
} from "@/shared/api";

/**
 * With `filter`, only the media the listing would show under it are counted, so a count says what picking
 * that tag leaves. Without one, every tag in use comes back, whichever side of the trash its media sit on.
 * `syncedAt` sits in the query key for the same reason the listing's does.
 * Empty while the first read is in flight and where nothing is tagged — a picker reads the same either
 * way, so the two aren't told apart here.
 */
export const useTagList = (input: {
	filter?: MediaFilter;
	syncedAt: string | null | undefined;
}): TagUsage[] => {
	const params: ListTagsParams | undefined = input.filter && {
		// Spelled out because the tag count reads every side when it is left out, unlike the listing
		state: input.filter.state ?? "filed",
		logicalPath: input.filter.logicalPath,
		contentTypePrefix: input.filter.contentTypePrefix,
		tag: input.filter.tags,
	};
	const query = useListTags(params, {
		query: {
			enabled: input.syncedAt !== undefined,
			queryKey: [...getListTagsQueryKey(params), input.syncedAt ?? null],
			// The buttons stay where they are while a changed filter is counted again, instead of blanking
			placeholderData: keepPreviousData,
		},
	});

	return query.data?.status === 200 ? query.data.data.tags : [];
};
