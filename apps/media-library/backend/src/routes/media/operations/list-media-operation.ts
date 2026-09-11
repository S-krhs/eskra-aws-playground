// In scope: reading one page of the listing and shaping it for the screen
// Out of scope: validating the query, HTTP status codes, DB query construction
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type { MediaObjectCursor } from "@eskra-aws-playground/repositories/media/media-object/types.js";
import type { MediaListResponse } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

export const listMediaOperation = async (input: {
	trashed: boolean;
	logicalPath?: string;
	contentTypePrefix?: string;
	tagName?: string;
	limit: number;
	cursor?: MediaObjectCursor;
}): Promise<OperationResult<MediaListResponse>> => {
	const page = await mediaObjectRepository.findPage(input);

	return {
		kind: "OK",
		data: {
			// The object key never leaves the server, and the repository reports the thumbnail's
			// presence rather than its key
			objects: page.objects.map((media) => {
				return {
					id: media.id,
					fileName: media.fileName,
					logicalPath: media.logicalPath,
					contentType: media.contentType,
					byteSize: media.byteSize,
					width: media.width,
					height: media.height,
					durationMs: media.durationMs,
					hasThumbnail: media.hasThumbnail,
					tags: media.tags,
					uploadedAt: media.uploadedAt.toISOString(),
				};
			}),
			nextCursor: page.nextCursor
				? {
						uploadedAt: page.nextCursor.uploadedAt.toISOString(),
						id: page.nextCursor.id,
					}
				: null,
		},
	};
};
