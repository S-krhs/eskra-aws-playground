// In scope: the ETag a response carries, the caching it enables, and reading back the ones a caller holds
// Out of scope: which route answers with one, where the value comes from, status codes
//
// HTTP has two kinds of ETag, and which one a response may use depends on where its value came from:
// a strong one (`"abc"`) claims the bytes are identical, a weak one (`W/"abc"`) only that the content
// is the same thing. A conditional Range (`If-Range`) is answered from a strong tag alone, so a route
// that serves ranges has to have one.

/**
 * Revalidate on every read.
 * An ETag only helps where the URL stays put while the content behind it can change, which is exactly
 * this app: a rebuilt thumbnail and a replaced original both keep their id. Revalidating costs one 304
 * and can never serve a stale body.
 */
export const REVALIDATE_CACHE_CONTROL = "private, max-age=0, must-revalidate";

/** For a value that identifies the content rather than the bytes being sent — a derived image, say. */
export const toWeakEtag = (etag: string): string => {
	return `W/"${etag}"`;
};

/** For a value that identifies the very bytes being sent, which is what a conditional Range needs. */
export const toStrongEtag = (etag: string): string => {
	return `"${etag}"`;
};

/** If-None-Match carries a comma-separated list, and each entry may be quoted and marked weak. */
export const parseIfNoneMatch = (header: string | undefined): string[] => {
	if (!header) {
		return [];
	}

	return header.split(",").map((entry) => {
		return entry.trim().replace(/^W\//, "").replace(/^"|"$/g, "");
	});
};
