// In scope: putting one media object in the trash, and taking it back out
// Out of scope: validating the id, HTTP status codes, deleting anything from storage
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

/**
 * The stored object is never touched: the trash is a column, so nothing here can fail halfway and
 * leave the media and its record disagreeing.
 * NOT_FOUND when no row carries this id.
 */
export const setMediaTrashedOperation = async (input: {
	mediaId: string;
	trashed: boolean;
}): Promise<OperationResult<undefined, { kind: "NOT_FOUND" }>> => {
	const updated = await mediaObjectRepository.updateTrashedAt(
		input.mediaId,
		input.trashed ? new Date() : null,
	);

	return updated === 0
		? { kind: "NOT_FOUND" }
		: { kind: "OK", data: undefined };
};
