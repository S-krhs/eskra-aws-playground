// In scope: saving the tags on one media object, and refreshing what shows them
// Out of scope: rendering, holding what is being edited, reading the tags in use, the words shown for it
import { useQueryClient } from "@tanstack/react-query";
import {
	getListMediaQueryKey,
	getListTagsQueryKey,
	type MutationStatus,
	toMutationStatus,
	useReplaceMediaTags,
} from "@/shared/api";

export interface MediaTags {
	save: (mediaId: string, tags: string[]) => void;
	status: MutationStatus;
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
		status: toMutationStatus(replace),
	};
};
