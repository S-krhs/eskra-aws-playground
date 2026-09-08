// In scope: the top-level prefixes the media bucket is laid out with
// Out of scope: key construction, object metadata, talking to storage, DB rows

/** Where an upload lands and waits for its thumbnail. */
export const PENDING_PREFIX = "_pending";

/** Where media goes once it has a thumbnail — everything unsorted lives here. */
export const INBOX_PREFIX = "_inbox";

/** Where media goes when thumbnail generation gave up on it, so a later sync stops re-requesting it. */
export const FAILED_PREFIX = "_failed";

/** Doesn't include the logical path, so a move never has to touch it. */
export const THUMBNAIL_PREFIX = "_thumb";
