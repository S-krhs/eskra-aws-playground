// In scope: the folders there are to file into, from both places one can exist
// Out of scope: HTTP status codes, moving media, creating a folder
import { mediaFolderRepository } from "@eskra-aws-playground/repositories/media/media-folder/repository.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type { FolderListResponse } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

/**
 * A library folder exists either because something is filed there or because it was registered on its
 * own, and the two lists overlap — a folder emptied by moving its media out is only in the second.
 * Only the library's folders are ever registered, so an archive folder is there only while it holds media.
 */
export const listFoldersOperation = async (input: {
	isArchived: boolean;
}): Promise<OperationResult<FolderListResponse>> => {
	if (input.isArchived) {
		return {
			kind: "OK",
			data: {
				folders: await mediaObjectRepository.findAllLogicalPaths({
					isArchived: true,
				}),
			},
		};
	}

	const [registered, inUse] = await Promise.all([
		mediaFolderRepository.findAll(),
		mediaObjectRepository.findAllLogicalPaths({ isArchived: false }),
	]);

	return {
		kind: "OK",
		data: { folders: [...new Set([...registered, ...inUse])].sort() },
	};
};
