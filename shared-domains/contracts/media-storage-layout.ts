// In scope: where media lives in R2, and the object-metadata vocabulary
// Out of scope: key construction, encoding metadata, talking to R2

/** Landing zone for an upload — everything unsorted lives here. */
export const INBOX_PREFIX = "_inbox";

/** Doesn't include the logical path, so a move never has to touch it. */
export const THUMBNAIL_PREFIX = "_thumb";

/** Metadata key holding the UUID that identifies a media object. */
export const MEDIA_ID_METADATA_KEY = "media-id";

/** Metadata key holding the file's original name at upload. */
export const ORIGINAL_NAME_METADATA_KEY = "original-name";

export interface MediaObjectMetadata {
	mediaId: string;
	originalName: string;
}
