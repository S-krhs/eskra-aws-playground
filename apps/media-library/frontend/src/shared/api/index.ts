// In scope: what the generated API client offers the slices
// Out of scope: how the client is generated, the query client's settings
export type {
	copyMediaToClipboardResponse as CopyMediaToClipboardResponse,
	ListMediaState,
	Media,
	MediaCursor,
	replaceMediaTagsResponse as ReplaceMediaTagsResponse,
	restoreMediaResponse as RestoreMediaResponse,
	SyncRun,
	trashMediaResponse as TrashMediaResponse,
} from "./generated/media-library.js";
export {
	getListMediaQueryKey,
	getListTagsQueryKey,
	listMedia,
	useCopyMediaToClipboard,
	useListTags,
	useReadSyncStatus,
	useReplaceMediaTags,
	useRestoreMedia,
	useStartSync,
	useTrashMedia,
} from "./generated/media-library.js";
export { queryClient } from "./query-client.js";
