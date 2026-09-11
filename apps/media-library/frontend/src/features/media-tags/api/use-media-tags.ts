// In scope: saving the tags on one media object, and refreshing what shows them
// Out of scope: rendering, holding what is being edited, reading the tags in use
import { useQueryClient } from "@tanstack/react-query";
import {
	getListMediaQueryKey,
	getListTagsQueryKey,
	type ReplaceMediaTagsResponse,
	useReplaceMediaTags,
} from "@/shared/api";

/** The generated client resolves a 404 or a 500 instead of rejecting, so a failure is read off the status. */
const toFailure = (
	response: ReplaceMediaTagsResponse | undefined,
): string | undefined => {
	return response && response.status !== 200
		? response.data.message
		: undefined;
};

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
		error: toFailure(replace.data),
	};
};
