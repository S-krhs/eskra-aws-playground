// In scope: the vocabulary a media object stored in R2 is described by — its extension allowlist, key input and metadata keys
// Out of scope: building or reading a key, encoding metadata, inspecting a file's content, talking to R2
import { z } from "zod";

// Explicit allowlist — an extension not listed here is never treated as media
export const CONTENT_TYPES: Record<string, string> = {
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

/** `sequence` is the counter appended when two files land on the same timestamp. */
export interface MediaObjectKeyInput {
	logicalPath: string;
	modifiedAt: Date;
	extension: string;
	sequence?: number;
}

export const MEDIA_ID_METADATA_KEY = "media-id";

export const ORIGINAL_NAME_METADATA_KEY = "original-name";

export interface MediaObjectMetadata {
	mediaId: string;
	originalName: string;
}

/** Anyone can write object metadata, so a media-id off the wire is checked before it is trusted. */
export const mediaIdSchema = z.uuid();
