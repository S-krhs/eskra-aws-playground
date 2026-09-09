// In scope: listing, reading, storing and moving the media objects held in storage, and the keys they take
// Out of scope: reading metadata's meaning, DB rows, thumbnail generation
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
import {
	buildAreaKeyKeepingName,
	buildAreaObjectKey,
	buildThumbnailKey,
	extractLogicalPath,
	resolveArea,
} from "./internal/object-key.js";
import type {
	CopyIntoAreaInput,
	GetStoredObjectInput,
	MediaStorageArea,
	MoveIntoAreaInput,
	NamedMediaStorageArea,
	StoredObjectBody,
	StoredObjectLocation,
	StoredObjectMetadata,
	StoredObjectSummary,
	UploadIntoAreaInput,
	UploadThumbnailInput,
} from "./types.js";

// Files sharing a modified time are rare; going past this points at a skew in what is being taken in
const MAX_KEY_SEQUENCE = 100;

const THUMBNAIL_CONTENT_TYPE = "image/webp";

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
		area: resolveArea(Key),
		logicalPath: extractLogicalPath(Key),
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

	/** Which area of the bucket a key sits in, for a key that came from a listing or a stored row. */
	resolveArea: (key: string): MediaStorageArea => {
		return resolveArea(key);
	},

	/**
	 * Stores a new object in an area under a key built from its modified time.
	 * A large body switches to multipart automatically.
	 */
	uploadIntoArea: async (
		input: UploadIntoAreaInput,
	): Promise<StoredObjectLocation> => {
		const key = await resolveFreeAreaKey(input);
		const upload = new Upload({
			client: getR2Client(),
			params: {
				Bucket: getMediaBucket(),
				Key: key,
				Body: input.body,
				ContentType: input.contentType,
				Metadata: input.metadata,
			},
		});

		await upload.done();

		return await describeStored(key);
	},

	/**
	 * Copies an object into an area under a newly built key, leaving the source in place.
	 * `REPLACE` only when `metadata` is passed — omitting it carries over the source's metadata.
	 * A single CopyObject tops out at 5GB; past that needs multipart copy.
	 */
	copyIntoArea: async (
		input: CopyIntoAreaInput,
	): Promise<StoredObjectLocation> => {
		const bucket = getMediaBucket();
		const key = await resolveFreeAreaKey(input);

		await getR2Client().send(
			new CopyObjectCommand({
				Bucket: bucket,
				Key: key,
				CopySource: buildCopySource(bucket, input.sourceKey),
				MetadataDirective: input.metadata ? "REPLACE" : undefined,
				Metadata: input.metadata,
				ContentType: input.contentType,
			}),
		);

		return await describeStored(key);
	},

	/**
	 * Moves an object into an area, keeping its file name. Errors rather than overwriting when that
	 * name is already taken there, and undoes the copy if the source can't be removed afterwards.
	 */
	moveIntoArea: async (
		input: MoveIntoAreaInput,
	): Promise<StoredObjectLocation> => {
		const bucket = getMediaBucket();
		const key = buildAreaKeyKeepingName(input);

		if (await mediaStorageRepository.headIfExists(key)) {
			throw new Error(`移動先の key が既に埋まっています: ${key}`);
		}

		await getR2Client().send(
			new CopyObjectCommand({
				Bucket: bucket,
				Key: key,
				CopySource: buildCopySource(bucket, input.key),
			}),
		);

		const location = await describeStored(key);

		try {
			await mediaStorageRepository.delete(input.key);
		} catch (error) {
			await mediaStorageRepository.delete(key);

			throw error;
		}

		return location;
	},

	/** Stores a media object's thumbnail and returns the key it took, which is built from the media's id. */
	uploadThumbnail: async (input: UploadThumbnailInput): Promise<string> => {
		const key = buildThumbnailKey(input.mediaId);
		const upload = new Upload({
			client: getR2Client(),
			params: {
				Bucket: getMediaBucket(),
				Key: key,
				Body: input.body,
				ContentType: THUMBNAIL_CONTENT_TYPE,
			},
		});

		await upload.done();

		return key;
	},

	/** Removes a media object's thumbnail. One that was never generated isn't an error. */
	deleteThumbnail: async (mediaId: string): Promise<void> => {
		await mediaStorageRepository.delete(buildThumbnailKey(mediaId));
	},

	/** Deletes an object. A key that doesn't exist isn't an error. */
	delete: async (key: string): Promise<void> => {
		await getR2Client().send(
			new DeleteObjectCommand({ Bucket: getMediaBucket(), Key: key }),
		);
	},
};

/** Steps past a key already taken, so two files sharing a modified millisecond don't collide. */
const resolveFreeAreaKey = async (input: {
	area: Exclude<NamedMediaStorageArea, "thumbnail">;
	modifiedAt: Date;
	extension: string;
}): Promise<string> => {
	for (let sequence = 0; sequence <= MAX_KEY_SEQUENCE; sequence += 1) {
		const key = buildAreaObjectKey({
			...input,
			// The first key carries no counter; a collision starts numbering at -2
			sequence: sequence === 0 ? undefined : sequence + 1,
		});

		if (!(await mediaStorageRepository.headIfExists(key))) {
			return key;
		}
	}

	throw new Error(
		`同じ更新日時の key が ${MAX_KEY_SEQUENCE} 件を超えて埋まっています`,
	);
};

/**
 * Reads back what was just written. A copy's etag doesn't always match the original's (when the
 * original went up as multipart), so registering the source's would make the next sync read it as
 * a replacement and rebuild the thumbnail.
 */
const describeStored = async (key: string): Promise<StoredObjectLocation> => {
	const stored = await mediaStorageRepository.head(key);

	return {
		key,
		logicalPath: extractLogicalPath(key),
		byteSize: stored.byteSize,
		etag: stored.etag,
	};
};
