// In scope: the folders there are to file into, from both places one can exist
// Out of scope: HTTP status codes, moving media, creating a folder
import { mediaFolderRepository } from "@eskra-aws-playground/repositories/media/media-folder/repository.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type { FolderListResponse } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

/**
 * A folder exists either because something is filed there or because it was registered on its own,
 * and the two lists overlap — a folder emptied by moving its media out is only in the second.
 */
export const listFoldersOperation = async (): Promise<
	OperationResult<FolderListResponse>
> => {
	const [registered, inUse] = await Promise.all([
		mediaFolderRepository.findAll(),
		mediaObjectRepository.findAllLogicalPaths(),
	]);

	return {
		kind: "OK",
		data: { folders: [...new Set([...registered, ...inUse])].sort() },
	};
};
