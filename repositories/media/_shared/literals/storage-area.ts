// In scope: the areas the media bucket is laid out in, and the prefix each one sits under
// Out of scope: building or reading a key, talking to storage, DB rows

/**
 * The areas a caller names instead of building a key. `pending` is where an upload waits for its
 * thumbnail, `inbox` is where media goes once it has one, `failed` is where thumbnail generation
 * gave up on it, `deleted` is where media put in the trash waits, and `thumbnail` holds the thumbnails.
 */
export type NamedMediaStorageArea =
	| "pending"
	| "inbox"
	| "failed"
	| "deleted"
	| "thumbnail";

/** `other` is media filed into a folder of its own, which is where everything sorted ends up. */
export type MediaStorageArea = NamedMediaStorageArea | "other";

/** Never leaves the package — a caller names the area instead. */
export const AREA_PREFIXES = {
	pending: "_pending",
	inbox: "_inbox",
	failed: "_failed",
	deleted: "_deleted",
	thumbnail: "_thumb",
} as const satisfies Record<NamedMediaStorageArea, string>;
