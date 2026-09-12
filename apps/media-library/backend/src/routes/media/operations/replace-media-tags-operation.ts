// In scope: making one media object's tags exactly the ones asked for
// Out of scope: validating the request, HTTP status codes, what a tag is stored as
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaTagRepository } from "@eskra-aws-playground/repositories/media/media-tag/repository.js";
import type { TagListResponse } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

/** Trimmed, blanks dropped and de-duplicated, so the same set of names always becomes the same rows. */
const toTagNames = (names: string[]): string[] => {
	return [
		...new Set(
			names
				.map((name) => {
					return name.trim();
				})
				.filter((name) => {
					return name !== "";
				}),
		),
	];
};

/**
 * NOT_FOUND before anything is written, so a tag is never created for a media object that isn't there.
 * Returns the tags the object carries afterwards.
 */
export const replaceMediaTagsOperation = async (input: {
	mediaId: string;
	tagNames: string[];
}): Promise<OperationResult<TagListResponse, { kind: "NOT_FOUND" }>> => {
	const media = await mediaObjectRepository.findUntrashedById(input.mediaId);

	if (!media) {
		return { kind: "NOT_FOUND" };
	}

	const tags = await mediaTagRepository.replaceObjectTags(
		input.mediaId,
		toTagNames(input.tagNames),
	);

	return {
		kind: "OK",
		data: {
			tags: tags.map((tag) => {
				return tag.name;
			}),
		},
	};
};
