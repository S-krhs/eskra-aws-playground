// In scope: saving the tags on one media object, and refreshing what shows them
// Out of scope: rendering, holding what is being edited, reading the tags in use
import { useQueryClient } from "@tanstack/react-query";
import {
	getListMediaQueryKey,
	getListTagsQueryKey,
	toMutationFailure,
	useReplaceMediaTags,
} from "@/shared/api";

/** Saving the tags of one media object, and what went wrong with the last save. */
export interface MediaTags {
	save: (mediaId: string, tags: string[]) => void;
	error: string | undefined;
}

export const useMediaTags = (): MediaTags => {
	const queryClient = useQueryClient();
	const replace = useReplaceMediaTags({
		mutation: {
			onSuccess: async () => {
				// A name used for the first time, or left on nothing, changes what there is to pick from,
				// and the listing carries the tags it shows
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: getListTagsQueryKey() }),
					queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() }),
				]);
			},
		},
	});

	return {
		save: (mediaId, tags) => {
			replace.mutate({ id: mediaId, data: { tags } });
		},
		error: toMutationFailure(replace, 200),
	};
};
