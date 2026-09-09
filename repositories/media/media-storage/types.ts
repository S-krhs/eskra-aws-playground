// In scope: input/output types for the stored media objects
// Out of scope: talking to the storage, key construction, DB row shapes
import type { Readable } from "node:stream";

/**
 * The areas the media bucket is laid out in. A caller names one instead of building a key:
 * `pending` is where an upload waits for its thumbnail, `inbox` is where media goes once it has one,
 * `failed` is where thumbnail generation gave up on it, and `thumbnail` holds the thumbnails.
 */
export type NamedMediaStorageArea =
	| "pending"
	| "inbox"
	| "failed"
	| "thumbnail";

/** `other` is media filed into a folder of its own, which is where everything sorted ends up. */
export type MediaStorageArea = NamedMediaStorageArea | "other";

export interface StoredObjectSummary {
	key: string;
	area: MediaStorageArea;
	/** The key's directory part; empty for a key sitting at the bucket root. */
	logicalPath: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
}

/** Where an object ended up after being stored or moved. */
export interface StoredObjectLocation {
	key: string;
	logicalPath: string;
	byteSize: number;
	etag: string;
}

/** Stores a new object under a key built from `modifiedAt`, stepping past a key already taken. */
export interface UploadIntoAreaInput {
	area: Exclude<NamedMediaStorageArea, "thumbnail">;
	modifiedAt: Date;
	extension: string;
	body: Readable | Uint8Array | string;
	contentType: string;
	metadata?: Record<string, string>;
}

/** Copies an existing object into an area under a newly built key; the source is left in place. */
export interface CopyIntoAreaInput {
	sourceKey: string;
	area: Exclude<NamedMediaStorageArea, "thumbnail">;
	modifiedAt: Date;
	extension: string;
	metadata?: Record<string, string>;
	contentType?: string;
}

/** Moves an object into an area keeping its file name; fails when that name is already taken there. */
export interface MoveIntoAreaInput {
	key: string;
	area: Exclude<NamedMediaStorageArea, "thumbnail">;
}

/** `metadata` is the object's custom metadata. */
export interface StoredObjectMetadata {
	contentType: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
	metadata: Record<string, string>;
}

/** `isPartial`/`contentRange` reflect whether `range` was passed. */
export interface StoredObjectBody {
	body: ReadableStream<Uint8Array>;
	contentType: string;
	byteSize: number;
	contentRange: string | undefined;
	isPartial: boolean;
}

/** `range` is passed straight through as the HTTP `Range` header value. */
export interface GetStoredObjectInput {
	key: string;
	range?: string;
}

export interface UploadThumbnailInput {
	mediaId: string;
	body: Readable | Uint8Array | string;
}
