// In scope: the extension allowlist and the content-type each one maps to
// Out of scope: inspecting a file's actual content, key construction, talking to external storage

// Explicit allowlist — an extension not listed here is never treated as media
const CONTENT_TYPES: Record<string, string> = {
	avi: "video/x-msvideo",
	avif: "image/avif",
	bmp: "image/bmp",
	gif: "image/gif",
	jpeg: "image/jpeg",
	jpg: "image/jpeg",
	mkv: "video/x-matroska",
	mov: "video/quicktime",
	mp4: "video/mp4",
	png: "image/png",
	webm: "video/webm",
	webp: "image/webp",
};

/** Returns undefined for an unlisted extension — the caller skips that file. */
export const resolveContentType = (extension: string): string | undefined => {
	const listed = extension.replace(/^\./, "").toLowerCase();

	// A file named `x.constructor` would otherwise reach Object.prototype and come back as a function
	return Object.hasOwn(CONTENT_TYPES, listed)
		? CONTENT_TYPES[listed]
		: undefined;
};
