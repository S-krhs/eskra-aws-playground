// In scope: listing, reading, uploading, copying and deleting the media objects held in storage
// Out of scope: deciding keys, reading metadata's meaning, DB rows, thumbnail generation
import type { _Object } from "@aws-sdk/client-s3";
import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getMediaBucket, getR2Client } from "../../client/r2.js";
import type {
	CopyStoredObjectInput,
	GetStoredObjectInput,
	StoredObjectBody,
	StoredObjectMetadata,
	StoredObjectSummary,
	UploadStoredObjectInput,
} from "./types.js";

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

const toObjectSummary = (content: _Object): StoredObjectSummary => {
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

export const mediaStorageRepository = {
	/**
	 * Every object under `prefix`, or the whole bucket without one.
	 * One response holds 1000 keys, so 100k objects take about 100 requests.
	 */
	listAll: async (prefix?: string): Promise<StoredObjectSummary[]> => {
		const client = getR2Client();
		const bucket = getMediaBucket();
		const objects: StoredObjectSummary[] = [];
		let continuationToken: string | undefined;

		do {
			const response = await client.send(
				new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: prefix,
					ContinuationToken: continuationToken,
				}),
			);

			for (const content of response.Contents ?? []) {
				objects.push(toObjectSummary(content));
			}

			continuationToken = response.NextContinuationToken;
		} while (continuationToken);

		return objects;
	},

	/** Reads only an object's metadata. */
	head: async (key: string): Promise<StoredObjectMetadata> => {
		const response = await getR2Client().send(
			new HeadObjectCommand({ Bucket: getMediaBucket(), Key: key }),
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
		key: string,
	): Promise<StoredObjectMetadata | undefined> => {
		try {
			return await mediaStorageRepository.head(key);
		} catch (error) {
			if (isNotFound(error)) {
				return undefined;
			}

			throw error;
		}
	},

	/** Fetches an object's body. Passing `range` gets a partial response. */
	get: async (input: GetStoredObjectInput): Promise<StoredObjectBody> => {
		const response = await getR2Client().send(
			new GetObjectCommand({
				Bucket: getMediaBucket(),
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
	upload: async (input: UploadStoredObjectInput): Promise<void> => {
		const upload = new Upload({
			client: getR2Client(),
			params: {
				Bucket: getMediaBucket(),
				Key: input.key,
				Body: input.body,
				ContentType: input.contentType,
				Metadata: input.metadata,
			},
		});

		await upload.done();
	},

	/**
	 * Copies an object within the bucket.
	 * `REPLACE` only when `metadata` is passed — omitting it carries over the
	 * source's metadata. A single CopyObject tops out at 5GB; past that needs
	 * multipart copy.
	 */
	copy: async (input: CopyStoredObjectInput): Promise<void> => {
		const bucket = getMediaBucket();

		await getR2Client().send(
			new CopyObjectCommand({
				Bucket: bucket,
				Key: input.destinationKey,
				CopySource: buildCopySource(bucket, input.sourceKey),
				MetadataDirective: input.metadata ? "REPLACE" : undefined,
				Metadata: input.metadata,
				ContentType: input.contentType,
			}),
		);
	},

	/** Deletes an object. A key that doesn't exist isn't an error. */
	delete: async (key: string): Promise<void> => {
		await getR2Client().send(
			new DeleteObjectCommand({ Bucket: getMediaBucket(), Key: key }),
		);
	},
};
