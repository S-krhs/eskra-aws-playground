// In scope: R2 のオブジェクト操作の入出力型
// Out of scope: client の生成、オブジェクト操作、key の組み立て
import type { Readable } from "node:stream";

/** 一覧で得られる 1 オブジェクトの要約。 */
export interface R2ObjectSummary {
	key: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
}

/** 1 オブジェクトのメタデータ。metadata は x-amz-meta-* の custom metadata。 */
export interface R2ObjectMetadata {
	contentType: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
	metadata: Record<string, string>;
}

/** オブジェクトの本文。Range を渡した場合は部分応答になる。 */
export interface R2ObjectBody {
	body: ReadableStream<Uint8Array>;
	contentType: string;
	byteSize: number;
	contentRange: string | undefined;
	isPartial: boolean;
}

/** 一覧の取得入力。1 回の応答は最大 1000 件で、続きは continuationToken で辿る。 */
export interface ListObjectsInput {
	bucket: string;
	prefix?: string;
	continuationToken?: string;
	maxKeys?: number;
}

/** 一覧の取得結果。nextContinuationToken が undefined なら最後のページ。 */
export interface ListObjectsResult {
	objects: R2ObjectSummary[];
	nextContinuationToken: string | undefined;
}

/** key を指すオブジェクト操作の共通入力。 */
export interface ObjectLocation {
	bucket: string;
	key: string;
}

/** オブジェクトの取得入力。range には HTTP の Range ヘッダをそのまま渡す。 */
export interface GetObjectInput extends ObjectLocation {
	range?: string;
}

/** オブジェクトの保存入力。metadata は custom metadata として保存される。 */
export interface UploadObjectInput extends ObjectLocation {
	body: Readable | Uint8Array | string;
	contentType: string;
	metadata?: Record<string, string>;
}

/** 同一 bucket 内での複製入力。 */
export interface CopyObjectInput {
	bucket: string;
	sourceKey: string;
	destinationKey: string;
}
