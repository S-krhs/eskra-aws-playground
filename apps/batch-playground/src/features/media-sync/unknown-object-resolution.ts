// In scope: 未知の key の metadata を読み、新規・移動・取り込みへ振り分けて R2 と DB の入力を作る
// Out of scope: R2 の走査、DB への反映、サムネイル生成、進捗の記録
import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import type { R2Client } from "@eskra-aws-playground/integration-r2/r2-client.js";
import { r2ObjectStore } from "@eskra-aws-playground/integration-r2/r2-object-store.js";
import type {
	InsertMediaObjectInput,
	RelocateMediaObjectInput,
} from "@eskra-aws-playground/repositories/media/media-object/types.js";
import type { MediaObjectMetadata } from "@eskra-aws-playground/shared-domains/contracts/media-storage-layout.js";
import {
	buildInboxKey,
	extractLogicalPath,
} from "@eskra-aws-playground/shared-domains/protocols/media-object-key.js";
import {
	buildMediaObjectMetadata,
	parseMediaObjectMetadata,
} from "@eskra-aws-playground/shared-domains/protocols/media-object-metadata.js";
import type { ScannedObject } from "./sync-plan.js";

// HeadObject を 1 件ずつ待つと 10 万件の初回で終わらないため、まとめて投げる
const HEAD_CONCURRENCY = 20;

// 同じ更新日時が並ぶことは稀で、これを超えるなら取り込み対象の偏りを疑う
const MAX_KEY_SEQUENCE = 100;

/** 未知の key に対してやること。 */
export type UnknownObjectDecision =
	| { kind: "relocate"; mediaId: string }
	| { kind: "insert"; mediaId: string; originalName: string }
	| { kind: "adopt" };

/** 未知の key の解決結果。DB へ反映する入力だけを持つ。 */
export interface ResolvedUnknownObjects {
	inserts: InsertMediaObjectInput[];
	relocations: RelocateMediaObjectInput[];
}

/**
 * metadata と登録済み id から、未知の key に対してやることを決める。
 * media-id が無いものはアプリ外から置かれたものとして取り込む。
 */
export const decideUnknownObject = (
	metadata: MediaObjectMetadata | undefined,
	knownIds: ReadonlySet<string>,
): UnknownObjectDecision => {
	if (!metadata) {
		return { kind: "adopt" };
	}

	if (knownIds.has(metadata.mediaId)) {
		return { kind: "relocate", mediaId: metadata.mediaId };
	}

	return {
		kind: "insert",
		mediaId: metadata.mediaId,
		originalName: metadata.originalName,
	};
};

const resolveAvailableInboxKey = async (
	client: R2Client,
	bucket: string,
	modifiedAt: Date,
	extension: string,
): Promise<string> => {
	for (let sequence = 0; sequence <= MAX_KEY_SEQUENCE; sequence += 1) {
		const key = buildInboxKey({
			modifiedAt,
			extension,
			sequence: sequence === 0 ? undefined : sequence + 1,
		});

		if (!(await r2ObjectStore.headIfExists(client, { bucket, key }))) {
			return key;
		}
	}

	throw new Error(
		`同じ更新日時の key が ${MAX_KEY_SEQUENCE} 件を超えて埋まっています`,
	);
};

/**
 * アプリ外から置かれたオブジェクトを、UUID を採番して着地点へ移す。
 * Copy で metadata を付け、Delete で元を消す。Delete が失敗しても
 * UUID は新しい key に載っているため、次の同期で古い方を消せる。
 */
const adoptObject = async (
	client: R2Client,
	input: {
		bucket: string;
		object: ScannedObject;
		contentType: string;
		syncedAt: Date;
	},
): Promise<InsertMediaObjectInput> => {
	const mediaId = randomUUID();
	const originalName = basename(input.object.key);
	const destinationKey = await resolveAvailableInboxKey(
		client,
		input.bucket,
		input.object.lastModified,
		extname(input.object.key),
	);

	await r2ObjectStore.copy(client, {
		bucket: input.bucket,
		sourceKey: input.object.key,
		destinationKey,
		metadata: buildMediaObjectMetadata({ mediaId, originalName }),
		contentType: input.contentType,
	});
	await r2ObjectStore.delete(client, {
		bucket: input.bucket,
		key: input.object.key,
	});

	return {
		id: mediaId,
		objectKey: destinationKey,
		logicalPath: extractLogicalPath(destinationKey),
		fileName: originalName,
		contentType: input.contentType,
		byteSize: input.object.byteSize,
		etag: input.object.etag,
		uploadedAt: input.object.lastModified,
		syncedAt: input.syncedAt,
	};
};

/**
 * 未知の key を 1 件ずつ HeadObject して振り分ける。
 * ListObjectsV2 が custom metadata を返さないため、ここでだけ HeadObject を打つ。
 */
export const resolveUnknownObjects = async (
	client: R2Client,
	input: {
		bucket: string;
		objects: ScannedObject[];
		knownIds: ReadonlySet<string>;
		syncedAt: Date;
		/** 途中経過を都度知らせる。初回の取り込みは分単位で掛かるため。 */
		onProgress?: (resolved: ResolvedUnknownObjects) => Promise<void>;
	},
): Promise<ResolvedUnknownObjects> => {
	const inserts: InsertMediaObjectInput[] = [];
	const relocations: RelocateMediaObjectInput[] = [];

	for (
		let offset = 0;
		offset < input.objects.length;
		offset += HEAD_CONCURRENCY
	) {
		const chunk = input.objects.slice(offset, offset + HEAD_CONCURRENCY);
		const resolved = await Promise.all(
			chunk.map(async (object) => {
				const head = await r2ObjectStore.head(client, {
					bucket: input.bucket,
					key: object.key,
				});

				return { object, head };
			}),
		);

		for (const { object, head } of resolved) {
			const decision = decideUnknownObject(
				parseMediaObjectMetadata(head.metadata),
				input.knownIds,
			);

			if (decision.kind === "relocate") {
				relocations.push({
					id: decision.mediaId,
					objectKey: object.key,
					logicalPath: extractLogicalPath(object.key),
					syncedAt: input.syncedAt,
				});
				continue;
			}

			if (decision.kind === "insert") {
				inserts.push({
					id: decision.mediaId,
					objectKey: object.key,
					logicalPath: extractLogicalPath(object.key),
					fileName: decision.originalName || basename(object.key),
					contentType: head.contentType,
					byteSize: object.byteSize,
					etag: object.etag,
					uploadedAt: object.lastModified,
					syncedAt: input.syncedAt,
				});
				continue;
			}

			// 取り込みは R2 を書き換えるため、並列にせず 1 件ずつ行う
			inserts.push(
				await adoptObject(client, {
					bucket: input.bucket,
					object,
					contentType: head.contentType,
					syncedAt: input.syncedAt,
				}),
			);
		}

		await input.onProgress?.({ inserts, relocations });
	}

	return { inserts, relocations };
};
