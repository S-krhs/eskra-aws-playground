// In scope: the input/output types of the MediaObject repository
// Out of scope: validation schemas, DB access, key construction, thumbnail generation

/**
 * One media object under management.
 * The id is the UUID the object carries in its own storage metadata, and this table is the only place
 * the pairing between it and `objectKey` is held.
 */
export interface MediaObject {
	id: string;
	objectKey: string;
	/** Where the object sits inside its area, as the storage repository reports it. */
	logicalPath: string;
	fileName: string;
	contentType: string;
	byteSize: number;
	etag: string;
	width: number | undefined;
	height: number | undefined;
	durationMs: number | undefined;
	/** The key itself stays inside this package — read the thumbnail through the storage repository. */
	hasThumbnail: boolean;
	uploadedAt: Date;
	syncedAt: Date;
	/** When it was put in the trash; the object itself stays in storage either way. */
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

/** How one object is identified on either side — its row id, and the key it sits under in storage. */
export interface MediaObjectIdentity {
	id: string;
	objectKey: string;
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

/**
 * Re-points one object's key after it was moved.
 * A move is carried out as a copy, which can hand the destination a different etag, so the etag and
 * size are re-registered too — otherwise the next sync reads the object as replaced content.
 */
export interface RelocateMediaObjectInput {
	id: string;
	objectKey: string;
	logicalPath: string;
	byteSize: number;
	etag: string;
	syncedAt: Date;
}

/**
 * The result of generating a thumbnail. Dimensions and duration are passed only where readable.
 * `location` is passed only when the object was moved out of the pending area on the way.
 */
export interface UpdateThumbnailInput {
	id: string;
	width?: number;
	height?: number;
	durationMs?: number;
	location?: Omit<RelocateMediaObjectInput, "id">;
}

/** A position in the listing — the last item of the previous page. */
export interface MediaObjectCursor {
	uploadedAt: Date;
	id: string;
}

/** Listing conditions. `trashed` picks the side to read: the trash, or everything outside it. */
export interface FindMediaObjectPageInput {
	trashed: boolean;
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
