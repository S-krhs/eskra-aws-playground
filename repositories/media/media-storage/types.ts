// In scope: input/output types for the stored media objects
// Out of scope: talking to the storage, key construction, DB row shapes
import type { Readable } from "node:stream";
import type {
	MediaStorageArea,
	NamedMediaStorageArea,
} from "../_shared/literals/storage-area.js";

// Re-exported so a caller has one import path, next to the types that carry an area
export type {
	MediaStorageArea,
	NamedMediaStorageArea,
} from "../_shared/literals/storage-area.js";

export interface StoredObjectSummary {
	key: string;
	area: MediaStorageArea;
	/** Where the object sits inside its area; empty when it sits directly in one, or at the bucket root. */
	logicalPath: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
}

export interface StoredObjectLocation {
	key: string;
	logicalPath: string;
	byteSize: number;
	etag: string;
}

export interface UploadIntoAreaInput {
	area: Exclude<NamedMediaStorageArea, "thumbnail">;
	modifiedAt: Date;
	extension: string;
	body: Readable | Uint8Array | string;
	contentType: string;
	metadata?: Record<string, string>;
}

export interface CopyIntoAreaInput {
	sourceKey: string;
	area: Exclude<NamedMediaStorageArea, "thumbnail">;
	modifiedAt: Date;
	extension: string;
	metadata?: Record<string, string>;
	contentType?: string;
}

export interface MoveIntoAreaInput {
	key: string;
	area: Exclude<NamedMediaStorageArea, "thumbnail">;
}

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
