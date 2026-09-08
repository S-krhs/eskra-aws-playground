// In scope: reading one page of the listing and shaping it for the screen
// Out of scope: validating the query, HTTP status codes, DB query construction
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type {
	MediaObject,
	MediaObjectCursor,
} from "@eskra-aws-playground/repositories/media/media-object/types.js";
import type {
	Media,
	MediaListResponse,
} from "@eskra-aws-playground/shared-domains/media/library-api.js";
import type { OperationResult } from "../../intermediate-models/operation-result.js";

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

export const listMediaOperation = async (input: {
	logicalPath?: string;
	contentTypePrefix?: string;
	limit: number;
	cursor?: MediaObjectCursor;
}): Promise<OperationResult<MediaListResponse>> => {
	const page = await mediaObjectRepository.findPage(input);

	return {
		kind: "OK",
		data: {
			objects: page.objects.map(toMedia),
			nextCursor: page.nextCursor
				? {
						uploadedAt: page.nextCursor.uploadedAt.toISOString(),
						id: page.nextCursor.id,
					}
				: null,
		},
	};
};
