// In scope: R2 のオブジェクト操作(一覧・メタデータ取得・取得・保存・複製・削除)
// Out of scope: client の生成、key の組み立て、サムネイル生成、DB への反映
import type { Readable } from "node:stream";
import type { _Object } from "@aws-sdk/client-s3";
import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { R2Client } from "./r2-client.js";

/** 一覧で得られる 1 オブジェクトの要約。 */
export interface R2ObjectSummary {
	key: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
}

/** 1 オブジェクトのメタデータ。 */
export interface R2ObjectMetadata {
	contentType: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
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

/** オブジェクトの保存入力。 */
export interface UploadObjectInput extends ObjectLocation {
	body: Readable | Uint8Array | string;
	contentType: string;
}

/** 同一 bucket 内での複製入力。 */
export interface CopyObjectInput {
	bucket: string;
	sourceKey: string;
	destinationKey: string;
}

const unquoteEtag = (etag: string): string => {
	return etag.replace(/^"|"$/g, "");
};

const toObjectSummary = (content: _Object): R2ObjectSummary => {
	const { Key, Size, ETag, LastModified } = content;

	if (
		Key === undefined ||
		Size === undefined ||
		ETag === undefined ||
		LastModified === undefined
	) {
		throw new Error(
			`R2 の一覧応答に欠けた項目があります: ${Key ?? "(key が取れませんでした)"}`,
		);
	}

	return {
		key: Key,
		byteSize: Size,
		etag: unquoteEtag(ETag),
		lastModified: LastModified,
	};
};

/**
 * CopyObject へ渡す複製元を組み立てる。
 * key の "/" は path 区切りとして残し、それ以外の記号だけを encode する
 * (日本語のフォルダ名がそのままでは通らないため)。
 */
export const buildCopySource = (bucket: string, key: string): string => {
	const encodedKey = key
		.split("/")
		.map((segment) => {
			return encodeURIComponent(segment);
		})
		.join("/");

	return `${bucket}/${encodedKey}`;
};

/** prefix 配下のオブジェクトを 1 ページ分返す。 */
export const listObjects = async (
	client: R2Client,
	input: ListObjectsInput,
): Promise<ListObjectsResult> => {
	const response = await client.send(
		new ListObjectsV2Command({
			Bucket: input.bucket,
			Prefix: input.prefix,
			ContinuationToken: input.continuationToken,
			MaxKeys: input.maxKeys,
		}),
	);

	return {
		objects: (response.Contents ?? []).map(toObjectSummary),
		nextContinuationToken: response.NextContinuationToken,
	};
};

/** オブジェクトのメタデータだけを読む。 */
export const headObject = async (
	client: R2Client,
	input: ObjectLocation,
): Promise<R2ObjectMetadata> => {
	const response = await client.send(
		new HeadObjectCommand({ Bucket: input.bucket, Key: input.key }),
	);

	return {
		contentType: response.ContentType ?? "application/octet-stream",
		byteSize: response.ContentLength ?? 0,
		etag: unquoteEtag(response.ETag ?? ""),
		lastModified: response.LastModified ?? new Date(0),
	};
};

/** オブジェクトの本文を取得する。range を渡すと部分応答になる。 */
export const getObject = async (
	client: R2Client,
	input: GetObjectInput,
): Promise<R2ObjectBody> => {
	const response = await client.send(
		new GetObjectCommand({
			Bucket: input.bucket,
			Key: input.key,
			Range: input.range,
		}),
	);

	if (!response.Body) {
		throw new Error(`R2 のオブジェクトに本文がありません: ${input.key}`);
	}

	return {
		body: response.Body.transformToWebStream(),
		contentType: response.ContentType ?? "application/octet-stream",
		byteSize: response.ContentLength ?? 0,
		contentRange: response.ContentRange,
		isPartial: response.ContentRange !== undefined,
	};
};

/** オブジェクトを保存する。大きい本文は multipart へ自動で切り替わる。 */
export const uploadObject = async (
	client: R2Client,
	input: UploadObjectInput,
): Promise<void> => {
	const upload = new Upload({
		client,
		params: {
			Bucket: input.bucket,
			Key: input.key,
			Body: input.body,
			ContentType: input.contentType,
		},
	});

	await upload.done();
};

/**
 * 同一 bucket 内でオブジェクトを複製する。
 * 単発の CopyObject は 5GB までで、それを超えるものは multipart copy が要る。
 */
export const copyObject = async (
	client: R2Client,
	input: CopyObjectInput,
): Promise<void> => {
	await client.send(
		new CopyObjectCommand({
			Bucket: input.bucket,
			Key: input.destinationKey,
			CopySource: buildCopySource(input.bucket, input.sourceKey),
		}),
	);
};

/** オブジェクトを削除する。存在しない key でもエラーにならない。 */
export const deleteObject = async (
	client: R2Client,
	input: ObjectLocation,
): Promise<void> => {
	await client.send(
		new DeleteObjectCommand({ Bucket: input.bucket, Key: input.key }),
	);
};
