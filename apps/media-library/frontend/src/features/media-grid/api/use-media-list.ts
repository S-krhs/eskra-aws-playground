// In scope: fetching the listing page by page and appending as the user scrolls
// Out of scope: rendering, deciding the filter conditions, starting a sync
import { useInfiniteQuery } from "@tanstack/react-query";
import type { MediaFilter } from "@/entities/media";
import {
	getListMediaQueryKey,
	listMedia,
	type Media,
	type MediaCursor,
} from "@/shared/api";

/** The listing and what the screen needs to keep scrolling it. */
export interface MediaList {
	items: Media[];
	hasMore: boolean;
	isLoading: boolean;
	error: string | undefined;
	loadMore: () => void;
}

/**
 * `syncedAt` is the last finished sync's time. It sits in the query key, so a sync closing out
 * refetches the listing without anything having to watch for the transition.
 */
export const useMediaList = (input: {
	filter: MediaFilter;
	syncedAt: string | null;
}): MediaList => {
	const { logicalPath, contentTypePrefix } = input.filter;
	const query = useInfiniteQuery({
		queryKey: [
			...getListMediaQueryKey({ logicalPath, contentTypePrefix }),
			input.syncedAt,
		],
		queryFn: async ({ pageParam }) => {
			const response = await listMedia({
				logicalPath,
				contentTypePrefix,
				...(pageParam
					? { cursorUploadedAt: pageParam.uploadedAt, cursorId: pageParam.id }
					: {}),
			});

			if (response.status !== 200) {
				throw new Error(response.data.message);
			}

			return response.data;
		},
		initialPageParam: null as MediaCursor | null,
		getNextPageParam: (last) => {
			return last.nextCursor;
		},
	});

	return {
		items:
			query.data?.pages.flatMap((page) => {
				return page.objects;
			}) ?? [],
		hasMore: query.hasNextPage,
		isLoading: query.isFetching,
		error: query.error?.message,
		loadMore: () => {
			if (query.hasNextPage && !query.isFetchingNextPage) {
				void query.fetchNextPage();
			}
		},
	};
};
