// In scope: filing one media object into a folder — moving the stored object and re-pointing its row
// Out of scope: validating the path, HTTP status codes, how a key is built, listing folders
import { mediaFolderRepository } from "@eskra-aws-playground/repositories/media/media-folder/repository.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { MediaLocationResponse } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

/**
 * The stored object moves first and the row follows, the same order the sync's own moves take: a row
 * left pointing at the old key would be re-pointed by the next sync, while the reverse loses the media.
 * NOT_FOUND covers a trashed object too — the listing hides one, so there is nothing to file.
 */
export const moveMediaOperation = async (input: {
	mediaId: string;
	logicalPath: string;
}): Promise<OperationResult<MediaLocationResponse, { kind: "NOT_FOUND" }>> => {
	const media = await mediaObjectRepository.findUntrashedById(input.mediaId);

	if (!media) {
		return { kind: "NOT_FOUND" };
	}

	const moved = await mediaStorageRepository.moveToLogicalPath({
		key: media.objectKey,
		logicalPath: input.logicalPath,
	});

	// A row deleted while the object was moving is left to the next sync, which reads the object's own
	// id back out of its metadata and registers it where it now sits
	await mediaObjectRepository.relocateMany([
		{
			id: media.id,
			objectKey: moved.key,
			logicalPath: moved.logicalPath,
			byteSize: moved.byteSize,
			etag: moved.etag,
			syncedAt: new Date(),
		},
	]);

	// Registered so the folder keeps being offered once the last media moves back out of it
	if (moved.logicalPath !== "") {
		await mediaFolderRepository.insert(moved.logicalPath);
	}

	return { kind: "OK", data: { logicalPath: moved.logicalPath } };
};
