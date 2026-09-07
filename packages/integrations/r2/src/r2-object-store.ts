// In scope: R2 のオブジェクト操作(一覧・メタデータ取得・取得・保存・複製・削除)
// Out of scope: client の生成、key の組み立て、サムネイル生成、DB への反映
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
import type {
	CopyObjectInput,
	GetObjectInput,
	ListObjectsInput,
	ListObjectsResult,
	ObjectLocation,
	R2ObjectBody,
	R2ObjectMetadata,
	R2ObjectSummary,
	UploadObjectInput,
} from "./r2-object-types.js";

// SDK は HeadObject の 404 を NotFound、GetObject の 404 を NoSuchKey として投げる
const isNotFound = (error: unknown): boolean => {
	return (
		error instanceof Error &&
		(error.name === "NotFound" || error.name === "NoSuchKey")
	);
};

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

/** R2 のオブジェクト操作。client は呼び出し側が生成して渡す。 */
export const r2ObjectStore = {
	/** prefix 配下のオブジェクトを 1 ページ分返す。 */
	list: async (
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
	},

	/** オブジェクトのメタデータだけを読む。 */
	head: async (
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
			metadata: response.Metadata ?? {},
		};
	},

	/**
	 * オブジェクトが無ければ undefined を返す HeadObject。
	 * key の衝突判定に使うため、存在しないことをエラーにしない。
	 */
	headIfExists: async (
		client: R2Client,
		input: ObjectLocation,
	): Promise<R2ObjectMetadata | undefined> => {
		try {
			return await r2ObjectStore.head(client, input);
		} catch (error) {
			if (isNotFound(error)) {
				return undefined;
			}

			throw error;
		}
	},

	/** オブジェクトの本文を取得する。range を渡すと部分応答になる。 */
	get: async (
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
	},

	/** オブジェクトを保存する。大きい本文は multipart へ自動で切り替わる。 */
	upload: async (client: R2Client, input: UploadObjectInput): Promise<void> => {
		const upload = new Upload({
			client,
			params: {
				Bucket: input.bucket,
				Key: input.key,
				Body: input.body,
				ContentType: input.contentType,
				Metadata: input.metadata,
			},
		});

		await upload.done();
	},

	/**
	 * 同一 bucket 内でオブジェクトを複製する。
	 * metadata を渡したときだけ REPLACE にし、省略時は複製元の metadata を引き継ぐ。
	 * 単発の CopyObject は 5GB までで、それを超えるものは multipart copy が要る。
	 */
	copy: async (client: R2Client, input: CopyObjectInput): Promise<void> => {
		await client.send(
			new CopyObjectCommand({
				Bucket: input.bucket,
				Key: input.destinationKey,
				CopySource: buildCopySource(input.bucket, input.sourceKey),
				MetadataDirective: input.metadata ? "REPLACE" : undefined,
				Metadata: input.metadata,
				ContentType: input.contentType,
			}),
		);
	},

	/** オブジェクトを削除する。存在しない key でもエラーにならない。 */
	delete: async (client: R2Client, input: ObjectLocation): Promise<void> => {
		await client.send(
			new DeleteObjectCommand({ Bucket: input.bucket, Key: input.key }),
		);
	},
};
