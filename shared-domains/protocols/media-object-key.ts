// In scope: 更新日時とファイル名から R2 の key を組み立て、key から論理パスを取り出す
// Out of scope: 更新日時の取得、衝突の検出、R2 への通信、metadata の符号化
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import {
	INBOX_PREFIX,
	THUMBNAIL_PREFIX,
} from "../contracts/media-storage-layout.js";

dayjs.extend(utc);

// JST は夏時間がなく UTC+9 固定
const JST_UTC_OFFSET_MINUTES = 9 * 60;

const KEY_TIMESTAMP_FORMAT = "YYYYMMDD-HHmmssSSS";

/** key の本体を組み立てる入力。sequence は同じ時刻で衝突したときの連番。 */
export interface MediaObjectKeyInput {
	logicalPath: string;
	modifiedAt: Date;
	extension: string;
	sequence?: number;
}

/**
 * 更新日時を key に使う JST の時刻文字列へ変換する。
 * 2026-09-07T04:30:45.123Z(UTC) は 20260907-133045123 になる。
 */
export const formatKeyTimestamp = (modifiedAt: Date): string => {
	return dayjs(modifiedAt)
		.utcOffset(JST_UTC_OFFSET_MINUTES)
		.format(KEY_TIMESTAMP_FORMAT);
};

/**
 * 論理パスと更新日時から key を組み立てる。
 * 拡張子は先頭の "." の有無を問わず受け取り、小文字へ揃える。
 */
export const buildMediaObjectKey = (input: MediaObjectKeyInput): string => {
	const extension = input.extension.replace(/^\./, "").toLowerCase();
	const suffix = input.sequence === undefined ? "" : `-${input.sequence}`;
	const fileName = `${formatKeyTimestamp(input.modifiedAt)}${suffix}`;

	return `${input.logicalPath}/${fileName}${extension ? `.${extension}` : ""}`;
};

/** 着地点の key を組み立てる。 */
export const buildInboxKey = (
	input: Omit<MediaObjectKeyInput, "logicalPath">,
): string => {
	return buildMediaObjectKey({ ...input, logicalPath: INBOX_PREFIX });
};

/**
 * メディアの UUID からサムネイルの key を組み立てる。
 * 論理パスを含めないため移動で変わらず、DB に控えが無くても導ける。
 */
export const buildThumbnailKey = (mediaId: string): string => {
	return `${THUMBNAIL_PREFIX}/${mediaId}.webp`;
};

/**
 * key から論理パスを取り出す。
 * 階層を持たない key は論理パスなしとして空文字を返す。
 */
export const extractLogicalPath = (objectKey: string): string => {
	const separatorIndex = objectKey.lastIndexOf("/");

	return separatorIndex === -1 ? "" : objectKey.slice(0, separatorIndex);
};
