// In scope: the display shape of one media object the listing returns
// Out of scope: DB queries, assembling the HTTP response, fetching a thumbnail
import type { MediaObject } from "@eskra-aws-playground/repositories/media/media-object/types.js";

/**
 * One media object narrowed to what the screen needs. The screen never uses an R2 key, so none is
 * carried — only whether a thumbnail exists.
 */
export interface MediaView {
	id: string;
	fileName: string;
	logicalPath: string;
	contentType: string;
	byteSize: number;
	width: number | undefined;
	height: number | undefined;
	durationMs: number | undefined;
	hasThumbnail: boolean;
	uploadedAt: string;
}

/** Moves a repository media object into the display shape. */
export const toMediaView = (media: MediaObject): MediaView => {
	return {
		id: media.id,
		fileName: media.fileName,
		logicalPath: media.logicalPath,
		contentType: media.contentType,
		byteSize: media.byteSize,
		width: media.width,
		height: media.height,
		durationMs: media.durationMs,
		hasThumbnail: media.thumbnailKey !== undefined,
		uploadedAt: media.uploadedAt.toISOString(),
	};
};
