// In scope: reading one page of the listing and shaping it for the screen
// Out of scope: validating the query, HTTP status codes, DB query construction
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type { MediaObject } from "@eskra-aws-playground/repositories/media/media-object/types.js";
import type {
	Media,
	MediaListQuery,
	MediaListResponse,
} from "@eskra-aws-playground/shared-domains/media/library-api.js";

/** The object key never leaves the server, so only the thumbnail's presence is carried out. */
const toMedia = (media: MediaObject): Media => {
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

export const listMediaOperation = async (
	query: MediaListQuery,
): Promise<MediaListResponse> => {
	const page = await mediaObjectRepository.findPage({
		logicalPath: query.logicalPath,
		contentTypePrefix: query.contentTypePrefix,
		limit: query.limit,
		cursor:
			query.cursorUploadedAt && query.cursorId
				? {
						uploadedAt: new Date(query.cursorUploadedAt),
						id: query.cursorId,
					}
				: undefined,
	});

	return {
		objects: page.objects.map(toMedia),
		nextCursor: page.nextCursor
			? {
					uploadedAt: page.nextCursor.uploadedAt.toISOString(),
					id: page.nextCursor.id,
				}
			: null,
	};
};
