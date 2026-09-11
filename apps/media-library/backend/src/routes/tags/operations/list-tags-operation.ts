// In scope: reading the tags in use and shaping them for the screen
// Out of scope: HTTP status codes, DB query construction, tagging anything
import { mediaTagRepository } from "@eskra-aws-playground/repositories/media/media-tag/repository.js";
import type { TagListResponse } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

export const listTagsOperation = async (): Promise<
	OperationResult<TagListResponse>
> => {
	const tags = await mediaTagRepository.findAll();

	return {
		kind: "OK",
		// The id is the DB's business; the screen filters and labels by name
		data: {
			tags: tags.map((tag) => {
				return tag.name;
			}),
		},
	};
};
