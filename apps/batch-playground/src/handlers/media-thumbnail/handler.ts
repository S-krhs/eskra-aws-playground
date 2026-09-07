// In scope: サムネイル生成 Lambda のエントリポイント
// Out of scope: サムネイルの生成内容、R2 と DB への反映、message の送信
import {
	type MediaThumbnailResponse,
	mediaThumbnailJob,
} from "./media-thumbnail-job.js";

/** サムネイル生成 Lambda のエントリポイント。SQS からの起動を受ける。 */
export const handler = async (
	event: unknown,
): Promise<MediaThumbnailResponse> => {
	return mediaThumbnailJob(event);
};
