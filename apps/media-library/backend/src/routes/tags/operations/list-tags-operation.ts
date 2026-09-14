// In scope: reading the tags on the media a filter keeps and shaping them for the screen
// Out of scope: validating the query, HTTP status codes, DB query construction, tagging anything
import type { MediaObjectPageState } from "@eskra-aws-playground/repositories/media/media-object/types.js";
import { mediaTagRepository } from "@eskra-aws-playground/repositories/media/media-tag/repository.js";
import type { TagUsageListResponse } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

export const listTagsOperation = async (input: {
	state?: MediaObjectPageState;
	logicalPath?: string;
	contentTypePrefix?: string;
	tagNames?: string[];
}): Promise<OperationResult<TagUsageListResponse>> => {
	const tags = await mediaTagRepository.findUsages(input);

	return {
		kind: "OK",
		// The id is the DB's business; the screen filters and labels by name
		data: {
			tags: tags.map((tag) => {
				return { name: tag.name, mediaCount: tag.mediaCount };
			}),
		},
	};
};
