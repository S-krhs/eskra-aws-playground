// In scope: the input/output types of the MediaObject repository
// Out of scope: validation schemas, DB access, key construction, thumbnail generation

/** One media object under management. */
export interface MediaObject {
	id: string;
	objectKey: string;
	logicalPath: string;
	fileName: string;
	contentType: string;
	byteSize: number;
	etag: string;
	width: number | undefined;
	height: number | undefined;
	durationMs: number | undefined;
	thumbnailKey: string | undefined;
	uploadedAt: Date;
	syncedAt: Date;
	trashedAt: Date | undefined;
}

/**
 * The light projection a sync compares against an R2 listing.
 * etag is carried to catch content replaced under an unchanged key.
 */
export interface MediaObjectSummary {
	id: string;
	objectKey: string;
	etag: string;
}

/** One newly discovered object a sync registers. */
export interface InsertMediaObjectInput {
	id: string;
	objectKey: string;
	logicalPath: string;
	fileName: string;
	contentType: string;
	byteSize: number;
	etag: string;
	uploadedAt: Date;
	syncedAt: Date;
}

/**
 * Re-registers one object replaced under an unchanged key.
 * The thumbnail and dimensions have to be rebuilt, so this update clears them.
 */
export interface RefreshMediaObjectInput {
	id: string;
	byteSize: number;
	etag: string;
	uploadedAt: Date;
	syncedAt: Date;
}

/** Re-points one object's key after it was moved outside this app. */
export interface RelocateMediaObjectInput {
	id: string;
	objectKey: string;
	logicalPath: string;
	syncedAt: Date;
}

/** A media object with no thumbnail yet — the minimum the generation job needs. */
export interface ThumbnaillessMediaObject {
	id: string;
	objectKey: string;
}

export interface FindThumbnaillessInput {
	limit: number;
	/** Generation is retried up to this many times; past that the object drops out. */
	maxAttempts: number;
	/** Only objects enqueued before this time are re-enqueued — the boundary that keeps an in-flight message from being sent twice. */
	retryBefore: Date;
}

/** The result of generating a thumbnail; dimensions and duration are passed only where readable. */
export interface SetMediaThumbnailInput {
	id: string;
	thumbnailKey: string;
	width?: number;
	height?: number;
	durationMs?: number;
}

/** A position in the listing — the last item of the previous page. */
export interface MediaObjectCursor {
	uploadedAt: Date;
	id: string;
}

/** Listing conditions; trashed objects are always excluded. */
export interface FindMediaObjectPageInput {
	logicalPath?: string;
	contentTypePrefix?: string;
	limit: number;
	cursor?: MediaObjectCursor;
}

/** One page of the listing; an undefined nextCursor means this is the last one. */
export interface MediaObjectPage {
	objects: MediaObject[];
	nextCursor: MediaObjectCursor | undefined;
}
