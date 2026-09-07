// In scope: メディア同期 Lambda のエントリポイント
// Out of scope: 同期の処理内容、R2 の wire 解釈、DB への反映
import { type MediaSyncResponse, mediaSyncJob } from "./media-sync-job.js";

/**
 * メディア同期 Lambda のエントリポイント。cron と画面からの起動の両方が呼ぶ。
 * 大量削除の歯止めを越える場合だけ `{ "allowBulkDelete": true }` を渡す。
 */
export const handler = async (
	event: unknown = {},
): Promise<MediaSyncResponse> => {
	return mediaSyncJob(event);
};
