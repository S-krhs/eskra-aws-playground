// In scope: R2 の object metadata とメディアの素性の相互変換
// Out of scope: R2 への通信、key の組み立て、metadata の保存先の決定
import { z } from "zod";
import {
	MEDIA_ID_METADATA_KEY,
	type MediaObjectMetadata,
	ORIGINAL_NAME_METADATA_KEY,
} from "../contracts/media-storage-layout.js";

/**
 * メディアの素性を R2 へ渡す metadata へ変換する。
 * metadata は HTTP ヘッダとして送られ ASCII しか通らないため、
 * 日本語を含みうるファイル名は percent-encode する。
 */
export const buildMediaObjectMetadata = (
	metadata: MediaObjectMetadata,
): Record<string, string> => {
	return {
		[MEDIA_ID_METADATA_KEY]: metadata.mediaId,
		[ORIGINAL_NAME_METADATA_KEY]: encodeURIComponent(metadata.originalName),
	};
};

const mediaIdSchema = z.uuid();

/**
 * R2 から読んだ metadata をメディアの素性へ戻す。
 * metadata は誰でも書けるため、UUID として読めない media-id は
 * 無いものとして扱う(そのまま主キーへ入れると以降の登録が全て失敗する)。
 */
export const parseMediaObjectMetadata = (
	metadata: Record<string, string> | undefined,
): MediaObjectMetadata | undefined => {
	const mediaId = metadata?.[MEDIA_ID_METADATA_KEY];

	if (!mediaId || !mediaIdSchema.safeParse(mediaId).success) {
		return undefined;
	}

	const originalName = metadata?.[ORIGINAL_NAME_METADATA_KEY];

	return {
		mediaId,
		// 手で置かれた metadata が percent-encode されていない場合に落とさない
		originalName: originalName ? safeDecode(originalName) : "",
	};
};

const safeDecode = (value: string): string => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};
