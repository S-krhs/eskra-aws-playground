// In scope: R2 object operations (list, head, get, upload, copy, delete)
// Out of scope: client creation, key construction, thumbnail generation, DB writes
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

// The SDK throws HeadObject's 404 as NotFound, GetObject's 404 as NoSuchKey
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
 * Builds the `CopySource` value for `CopyObjectCommand`.
 * Keeps a key's `/` as path separators and percent-encodes everything else —
 * needed because a non-ASCII folder name doesn't survive as-is.
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

/** The caller creates and passes in `client`. */
export const r2ObjectStore = {
	/** Returns one page of objects under `prefix`. */
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

	/** Reads only an object's metadata. */
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
	 * HeadObject that returns undefined instead of throwing when the object
	 * doesn't exist — used for key-collision checks, where "not found" is expected.
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

	/** Fetches an object's body. Passing `range` gets a partial response. */
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

	/** Uploads an object. A large body switches to multipart automatically. */
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
	 * Copies an object within the same bucket.
	 * `REPLACE` only when `metadata` is passed — omitting it carries over the
	 * source's metadata. A single CopyObject tops out at 5GB; past that needs
	 * multipart copy.
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

	/** Deletes an object. A key that doesn't exist isn't an error. */
	delete: async (client: R2Client, input: ObjectLocation): Promise<void> => {
		await client.send(
			new DeleteObjectCommand({ Bucket: input.bucket, Key: input.key }),
		);
	},
};
