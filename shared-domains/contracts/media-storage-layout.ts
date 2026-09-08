// In scope: where media lives in R2
// Out of scope: key construction, object metadata, talking to R2

/** Landing zone for an upload — everything unsorted lives here. */
export const INBOX_PREFIX = "_inbox";

/** Doesn't include the logical path, so a move never has to touch it. */
export const THUMBNAIL_PREFIX = "_thumb";
