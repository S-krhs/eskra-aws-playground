// In scope: the URLs of the endpoints that answer with a file rather than JSON
// Out of scope: fetching, the generated client, rendering

/** What an <img> reads. Absent until the sync has had one generated, so the caller checks first. */
export const buildThumbnailUrl = (mediaId: string): string => {
	return `/api/media/${mediaId}/thumbnail`;
};

/**
 * The original itself, for an <img>/<video> src or an <a href>.
 * `download` asks the browser to save it rather than show it.
 */
export const buildMediaFileUrl = (
	mediaId: string,
	options?: { download: boolean },
): string => {
	return `/api/media/${mediaId}/file${options?.download ? "?download=1" : ""}`;
};
