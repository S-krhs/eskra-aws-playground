// In scope: R2 の走査結果と登録済みの key を突き合わせ、同期でやることを分類する
// Out of scope: R2 への通信、metadata の読み出し、DB への反映、サムネイル生成
import type { MediaObjectKey } from "@eskra-aws-playground/repositories/media/media-object/types.js";

/** R2 の一覧で見つかった 1 オブジェクト。 */
export interface ScannedObject {
	key: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
}

/** 同期でやることの分類。 */
export interface MediaSyncPlan {
	/** DB の key と一致した登録済みの id。確認時刻だけ更新する。 */
	unchangedIds: string[];
	/** DB に無い key。metadata を読んで新規か移動かを判定する。 */
	unknownObjects: ScannedObject[];
	/** DB にあって R2 に無い id。移動でなければ削除する。 */
	missingIds: string[];
}

/**
 * 走査結果と登録済みの key を突き合わせる。
 * key が一致するかどうかだけで分け、metadata を要する判定は呼び出し側に残す。
 * ListObjectsV2 が metadata を返さないため、この段階では HeadObject を打たない。
 */
export const buildMediaSyncPlan = (input: {
	scanned: ScannedObject[];
	known: MediaObjectKey[];
}): MediaSyncPlan => {
	const idByKey = new Map(
		input.known.map((media) => {
			return [media.objectKey, media.id];
		}),
	);

	const unchangedIds: string[] = [];
	const unknownObjects: ScannedObject[] = [];

	for (const object of input.scanned) {
		const id = idByKey.get(object.key);

		if (id === undefined) {
			unknownObjects.push(object);
			continue;
		}

		unchangedIds.push(id);
	}

	const foundIds = new Set(unchangedIds);
	const missingIds = input.known
		.filter((media) => {
			return !foundIds.has(media.id);
		})
		.map((media) => {
			return media.id;
		});

	return { unchangedIds, unknownObjects, missingIds };
};
