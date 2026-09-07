// In scope: fetching the listing and appending to it as the user scrolls
// Out of scope: display, deciding the filter conditions, starting a sync
import type { InferResponseType } from "hono/client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaFilter } from "@/entities/media";
import { apiClient } from "@/shared/api";

type ListResponse = InferResponseType<typeof apiClient.media.$get, 200>;
type Cursor = ListResponse["nextCursor"];

/** One media object in the listing; the type is derived from the backend's response. */
export type MediaItem = ListResponse["objects"][number];

export interface MediaPage {
	items: MediaItem[];
	hasMore: boolean;
	isLoading: boolean;
	error: string | undefined;
	loadMore: () => void;
	reload: () => void;
}

const toQuery = (
	filter: MediaFilter,
	cursor: Cursor,
): Record<string, string> => {
	return {
		...(filter.logicalPath ? { logicalPath: filter.logicalPath } : {}),
		...(filter.contentTypePrefix
			? { contentTypePrefix: filter.contentTypePrefix }
			: {}),
		...(cursor
			? { cursorUploadedAt: cursor.uploadedAt, cursorId: cursor.id }
			: {}),
	};
};

/**
 * Fetches the listing per filter condition. Changing a condition refetches from the top, and
 * loadMore appends the next page. Dependencies are tracked field by field, so a caller rebuilding
 * `filter` on every render doesn't trigger a refetch.
 */
export const useMediaPage = (filter: MediaFilter): MediaPage => {
	const { logicalPath, contentTypePrefix } = filter;
	const [items, setItems] = useState<MediaItem[]>([]);
	const [hasMore, setHasMore] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);
	const [reloadKey, setReloadKey] = useState(0);

	// Each request is numbered, so a response for the previous condition arriving late is discarded
	const requestId = useRef(0);
	const cursorRef = useRef<Cursor>(null);
	const loadingRef = useRef(false);

	const fetchPage = useCallback(
		async (cursor: Cursor, id: number) => {
			loadingRef.current = true;
			setIsLoading(true);

			try {
				const response = await apiClient.media.$get({
					query: toQuery({ logicalPath, contentTypePrefix }, cursor),
				});

				if (!response.ok) {
					throw new Error(`一覧の取得に失敗しました (${response.status})`);
				}

				const page = await response.json();

				if (requestId.current !== id) {
					return;
				}

				setItems((current) => {
					return cursor ? [...current, ...page.objects] : page.objects;
				});
				cursorRef.current = page.nextCursor;
				setHasMore(page.nextCursor !== null);
				setError(undefined);
			} catch (cause) {
				if (requestId.current === id) {
					setError(cause instanceof Error ? cause.message : String(cause));
					setHasMore(false);
				}
			} finally {
				if (requestId.current === id) {
					setIsLoading(false);
				}

				loadingRef.current = false;
			}
		},
		[logicalPath, contentTypePrefix],
	);

	useEffect(() => {
		requestId.current += 1;
		cursorRef.current = null;
		setItems([]);
		setHasMore(true);
		void fetchPage(null, requestId.current);
	}, [fetchPage, reloadKey]);

	const loadMore = useCallback(() => {
		if (loadingRef.current || !cursorRef.current) {
			return;
		}

		void fetchPage(cursorRef.current, requestId.current);
	}, [fetchPage]);

	const reload = useCallback(() => {
		setReloadKey((current) => {
			return current + 1;
		});
	}, []);

	return { items, hasMore, isLoading, error, loadMore, reload };
};
