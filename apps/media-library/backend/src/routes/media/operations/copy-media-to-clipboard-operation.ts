// In scope: putting one media object's original on the Windows clipboard as a file
// Out of scope: talking to Windows, validating the id, HTTP status codes
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import { copyFileToWindowsClipboard } from "../../../features/windows-clipboard/file-clipboard.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

/**
 * The whole object is read before it can be put on the clipboard, so a large video takes as long as
 * downloading it would.
 * A trashed object copies too, on the same terms as reading the original.
 */
export const copyMediaToClipboardOperation = async (input: {
	mediaId: string;
}): Promise<OperationResult<undefined, { kind: "NOT_FOUND" }>> => {
	const media = await mediaObjectRepository.findById(input.mediaId);

	if (!media) {
		return { kind: "NOT_FOUND" };
	}

	const object = await mediaStorageRepository.get({ key: media.objectKey });

	await copyFileToWindowsClipboard({
		mediaId: media.id,
		fileName: media.fileName,
		body: object.body,
	});

	return { kind: "OK", data: undefined };
};
