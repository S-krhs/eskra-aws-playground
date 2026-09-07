// In scope: 一覧の取得と、スクロールに合わせた継ぎ足し
// Out of scope: 表示、絞り込み条件の決め方、同期の起動
import type { InferResponseType } from "hono/client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaFilter } from "@/entities/media";
import { apiClient } from "@/shared/api";

type ListResponse = InferResponseType<typeof apiClient.media.$get, 200>;
type Cursor = ListResponse["nextCursor"];

/** 一覧に並べるメディア 1 件。backend の応答から型を導出する。 */
export type MediaItem = ListResponse["objects"][number];

/** 一覧の状態と操作。 */
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
 * 絞り込み条件ごとに一覧を取得する。
 * 条件を変えると先頭から取り直し、loadMore で次のページを継ぎ足す。
 * 呼び出し側が filter を毎回作り直しても取り直しが起きないよう、依存は項目単位で見る。
 */
export const useMediaPage = (filter: MediaFilter): MediaPage => {
	const { logicalPath, contentTypePrefix } = filter;
	const [items, setItems] = useState<MediaItem[]>([]);
	const [hasMore, setHasMore] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | undefined>(undefined);
	const [reloadKey, setReloadKey] = useState(0);

	// 条件を変えた直後に前の条件の応答が届いても捨てるため、要求ごとに番号を振る
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
