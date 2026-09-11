// In scope: what the generated API client offers the slices
// Out of scope: how the client is generated, the query client's settings
export type {
	copyMediaToClipboardResponse as CopyMediaToClipboardResponse,
	ListMediaState,
	Media,
	MediaCursor,
	restoreMediaResponse as RestoreMediaResponse,
	SyncRun,
	trashMediaResponse as TrashMediaResponse,
} from "./generated/media-library.js";
export {
	getListMediaQueryKey,
	listMedia,
	useCopyMediaToClipboard,
	useReadSyncStatus,
	useRestoreMedia,
	useStartSync,
	useTrashMedia,
} from "./generated/media-library.js";
export { queryClient } from "./query-client.js";
