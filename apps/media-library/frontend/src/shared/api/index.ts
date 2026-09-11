// In scope: what the generated API client offers the slices
// Out of scope: how the client is generated, the query client's settings
export type {
	copyMediaToClipboardResponse as CopyMediaToClipboardResponse,
	ListMediaState,
	Media,
	MediaCursor,
	moveMediaResponse as MoveMediaResponse,
	replaceMediaTagsResponse as ReplaceMediaTagsResponse,
	restoreMediaResponse as RestoreMediaResponse,
	SyncRun,
	trashMediaResponse as TrashMediaResponse,
} from "./generated/media-library.js";
export {
	getListFoldersQueryKey,
	getListMediaQueryKey,
	getListTagsQueryKey,
	listMedia,
	useCopyMediaToClipboard,
	useListFolders,
	useListTags,
	useMoveMedia,
	useReadSyncStatus,
	useReplaceMediaTags,
	useRestoreMedia,
	useStartSync,
	useTrashMedia,
} from "./generated/media-library.js";
export { queryClient } from "./query-client.js";
