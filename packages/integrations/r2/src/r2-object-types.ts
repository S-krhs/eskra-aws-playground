// In scope: input/output types for R2 object operations
// Out of scope: client creation, object operations, key construction
import type { Readable } from "node:stream";

export interface R2ObjectSummary {
	key: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
}

/** `metadata` is x-amz-meta-* custom metadata. */
export interface R2ObjectMetadata {
	contentType: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
	metadata: Record<string, string>;
}

/** `isPartial`/`contentRange` reflect whether `range` was passed. */
export interface R2ObjectBody {
	body: ReadableStream<Uint8Array>;
	contentType: string;
	byteSize: number;
	contentRange: string | undefined;
	isPartial: boolean;
}

/** One response page holds at most 1000 objects; follow `continuationToken` for more. */
export interface ListObjectsInput {
	bucket: string;
	prefix?: string;
	continuationToken?: string;
	maxKeys?: number;
}

/** `nextContinuationToken` undefined means this was the last page. */
export interface ListObjectsResult {
	objects: R2ObjectSummary[];
	nextContinuationToken: string | undefined;
}

export interface ObjectLocation {
	bucket: string;
	key: string;
}

/** `range` is passed straight through as the HTTP `Range` header value. */
export interface GetObjectInput extends ObjectLocation {
	range?: string;
}

export interface UploadObjectInput extends ObjectLocation {
	body: Readable | Uint8Array | string;
	contentType: string;
	metadata?: Record<string, string>;
}

/** Same-bucket copy. Passing `metadata` replaces the destination's custom metadata; omitting it carries the source's over. */
export interface CopyObjectInput {
	bucket: string;
	sourceKey: string;
	destinationKey: string;
	metadata?: Record<string, string>;
	contentType?: string;
}
