// In scope: input/output types for the stored media objects
// Out of scope: talking to the storage, key construction, DB row shapes
import type { Readable } from "node:stream";

export interface StoredObjectSummary {
	key: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
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

export interface UploadStoredObjectInput {
	key: string;
	body: Readable | Uint8Array | string;
	contentType: string;
	metadata?: Record<string, string>;
}

/** Passing `metadata` replaces the destination's custom metadata; omitting it carries the source's over. */
export interface CopyStoredObjectInput {
	sourceKey: string;
	destinationKey: string;
	metadata?: Record<string, string>;
	contentType?: string;
}
