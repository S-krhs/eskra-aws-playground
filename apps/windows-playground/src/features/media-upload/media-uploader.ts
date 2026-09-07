// In scope: 1 ファイルを R2 の着地点へ保存する(key の衝突回避と metadata の付与を含む)
// Out of scope: 引数の解釈、設定の読み込み、DB への反映、サムネイル生成
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { R2Client } from "@eskra-aws-playground/integration-r2/r2-client.js";
import {
	headObjectIfExists,
	uploadObject,
} from "@eskra-aws-playground/integration-r2/r2-object-store.js";
import { buildInboxKey } from "@eskra-aws-playground/shared-domains/protocols/media-object-key.js";
import { buildMediaObjectMetadata } from "@eskra-aws-playground/shared-domains/protocols/media-object-metadata.js";
import { resolveContentType } from "./media-content-type.js";

// 同じミリ秒に更新されたファイルが並ぶことは稀で、これを超えるなら設定の誤りを疑う
const MAX_KEY_SEQUENCE = 100;

/** 保存したメディアの所在。 */
export interface UploadedMedia {
	objectKey: string;
	mediaId: string;
	byteSize: number;
}

/** 保存の入力。filePath は WSL から見えるパス。 */
export interface UploadMediaFileInput {
	bucket: string;
	filePath: string;
}

const resolveAvailableKey = async (
	client: R2Client,
	bucket: string,
	modifiedAt: Date,
	extension: string,
): Promise<string> => {
	for (let sequence = 0; sequence <= MAX_KEY_SEQUENCE; sequence += 1) {
		const objectKey = buildInboxKey({
			modifiedAt,
			extension,
			// 最初の 1 つは連番を付けず、衝突したときだけ -2 から振る
			sequence: sequence === 0 ? undefined : sequence + 1,
		});

		if (!(await headObjectIfExists(client, { bucket, key: objectKey }))) {
			return objectKey;
		}
	}

	throw new Error(
		`同じ更新日時の key が ${MAX_KEY_SEQUENCE} 件を超えて埋まっています`,
	);
};

/**
 * ファイルを着地点へ保存する。
 * UUID と元のファイル名は metadata に載せ、DB へは書かない(同期が拾う)。
 */
export const uploadMediaFile = async (
	client: R2Client,
	input: UploadMediaFileInput,
): Promise<UploadedMedia> => {
	const stats = await stat(input.filePath);

	if (!stats.isFile()) {
		throw new Error("ファイルではありません");
	}

	const extension = extname(input.filePath);
	const contentType = resolveContentType(extension);

	if (!contentType) {
		throw new Error(`対象外の拡張子です: ${extension || "(拡張子なし)"}`);
	}

	const objectKey = await resolveAvailableKey(
		client,
		input.bucket,
		stats.mtime,
		extension,
	);
	const mediaId = randomUUID();

	await uploadObject(client, {
		bucket: input.bucket,
		key: objectKey,
		// 大きい動画をメモリに載せないため stream で渡す
		body: createReadStream(input.filePath),
		contentType,
		metadata: buildMediaObjectMetadata({
			mediaId,
			originalName: basename(input.filePath),
		}),
	});

	return { objectKey, mediaId, byteSize: stats.size };
};
