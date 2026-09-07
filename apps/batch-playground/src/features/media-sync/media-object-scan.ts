// In scope: R2 の全メディアを列挙する(ページングとメディアでない prefix の除外)
// Out of scope: metadata の読み出し、DB との突き合わせ、サムネイル生成

import { extname } from "node:path";
import type { R2Client } from "@eskra-aws-playground/integration-r2/r2-client.js";
import { r2ObjectStore } from "@eskra-aws-playground/integration-r2/r2-object-store.js";
import { resolveContentType } from "@eskra-aws-playground/shared-domains/contracts/media-content-type.js";
import { THUMBNAIL_PREFIX } from "@eskra-aws-playground/shared-domains/contracts/media-storage-layout.js";
import type { ScannedObject } from "./sync-plan.js";

const THUMBNAIL_KEY_PREFIX = `${THUMBNAIL_PREFIX}/`;

/**
 * 取り込む対象の key かどうかを判定する。
 * サムネイルはメディアそのものではないため外し、対象外の拡張子も外す。
 * ここで除外しておかないと、テキストやフォルダの placeholder まで取り込まれ、
 * サムネイル生成が毎回失敗して DLQ が埋まり続ける。
 */
export const isMediaKey = (key: string): boolean => {
	if (key.startsWith(THUMBNAIL_KEY_PREFIX)) {
		return false;
	}

	return resolveContentType(extname(key)) !== undefined;
};

/**
 * bucket 内の全メディアを列挙する。
 * 1 応答 1000 件を continuationToken で辿り、10 万件でも 100 リクエスト程度で終わる。
 */
export const scanMediaObjects = async (
	client: R2Client,
	bucket: string,
): Promise<ScannedObject[]> => {
	const objects: ScannedObject[] = [];
	let continuationToken: string | undefined;

	do {
		const page = await r2ObjectStore.list(client, {
			bucket,
			continuationToken,
		});

		for (const object of page.objects) {
			if (isMediaKey(object.key)) {
				objects.push(object);
			}
		}

		continuationToken = page.nextContinuationToken;
	} while (continuationToken);

	return objects;
};
