// In scope: 一覧が返すメディア 1 件の表示用の形
// Out of scope: DB の query、HTTP response の組み立て、サムネイルの取得
import type { MediaObject } from "@eskra-aws-playground/repositories/media/media-object/types.js";

/**
 * 画面が必要とする項目だけに絞ったメディア 1 件。
 * R2 の key は画面から使わないため載せず、サムネイルの有無だけを渡す。
 */
export interface MediaView {
	id: string;
	fileName: string;
	logicalPath: string;
	contentType: string;
	byteSize: number;
	width: number | undefined;
	height: number | undefined;
	durationMs: number | undefined;
	hasThumbnail: boolean;
	uploadedAt: string;
}

/** repository のメディアを表示用の形へ移す。 */
export const toMediaView = (media: MediaObject): MediaView => {
	return {
		id: media.id,
		fileName: media.fileName,
		logicalPath: media.logicalPath,
		contentType: media.contentType,
		byteSize: media.byteSize,
		width: media.width,
		height: media.height,
		durationMs: media.durationMs,
		hasThumbnail: media.thumbnailKey !== undefined,
		uploadedAt: media.uploadedAt.toISOString(),
	};
};
