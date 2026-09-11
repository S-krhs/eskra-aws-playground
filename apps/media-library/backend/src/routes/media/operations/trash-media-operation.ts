// In scope: putting one media object in the trash — moving the stored object aside and marking the row
// Out of scope: validating the id, HTTP status codes, how a key is built, taking it back out
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

/**
 * The stored object moves first and the row follows, the same order every other move here takes: a row
 * left pointing at the old key is re-pointed by the next sync, while the reverse loses track of where
 * the object actually is.
 * The object keeps the folder it was filed under inside the trash, which is where a restore reads its
 * way home from.
 * NOT_FOUND covers one already in the trash — there is nothing left to put there.
 */
export const trashMediaOperation = async (input: {
	mediaId: string;
}): Promise<OperationResult<undefined, { kind: "NOT_FOUND" }>> => {
	const media = await mediaObjectRepository.findUntrashedById(input.mediaId);

	if (!media) {
		return { kind: "NOT_FOUND" };
	}

	const moved = await mediaStorageRepository.moveIntoArea({
		key: media.objectKey,
		area: "deleted",
		logicalPath: media.logicalPath,
	});
	const trashedAt = new Date();

	await mediaObjectRepository.updateTrashedLocation({
		id: media.id,
		trashedAt,
		objectKey: moved.key,
		logicalPath: moved.logicalPath,
		byteSize: moved.byteSize,
		etag: moved.etag,
		syncedAt: trashedAt,
	});

	return { kind: "OK", data: undefined };
};
