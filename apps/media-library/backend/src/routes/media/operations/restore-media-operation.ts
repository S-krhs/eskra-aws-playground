// In scope: taking one media object back out of the trash, to the folder it was filed under
// Out of scope: validating the id, HTTP status codes, how a key is built, putting it in the trash
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

/**
 * Read through `findById`, since the row this acts on is exactly the one the listing hides.
 * One that isn't in the trash is already where this would put it, so it is answered as done rather
 * than moved a second time.
 * NOT_FOUND only when no row carries the id.
 */
export const restoreMediaOperation = async (input: {
	mediaId: string;
}): Promise<OperationResult<undefined, { kind: "NOT_FOUND" }>> => {
	const media = await mediaObjectRepository.findById(input.mediaId);

	if (!media) {
		return { kind: "NOT_FOUND" };
	}

	if (!media.trashedAt) {
		return { kind: "OK", data: undefined };
	}

	// The path the object kept inside the trash is where it goes back to; an empty one means it was
	// never filed anywhere, and the storage puts it back where unfiled media sits
	const moved = await mediaStorageRepository.moveToLogicalPath({
		key: media.objectKey,
		logicalPath: media.logicalPath,
	});

	await mediaObjectRepository.updateTrashedLocation({
		id: media.id,
		trashedAt: null,
		objectKey: moved.key,
		logicalPath: moved.logicalPath,
		byteSize: moved.byteSize,
		etag: moved.etag,
		syncedAt: new Date(),
	});

	return { kind: "OK", data: undefined };
};
