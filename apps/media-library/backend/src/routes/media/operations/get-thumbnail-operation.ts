// In scope: fetching one media object's thumbnail out of storage
// Out of scope: validating the id, HTTP status codes, generating a thumbnail
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

export interface Thumbnail {
	body: Uint8Array<ArrayBuffer>;
	contentType: string;
}

/** NOT_GENERATED until the sync has made one; the screen falls back to a placeholder. */
export const getThumbnailOperation = async (
	mediaId: string,
): Promise<OperationResult<Thumbnail, { kind: "NOT_GENERATED" }>> => {
	const media = await mediaObjectRepository.findById(mediaId);

	if (!media?.thumbnailKey) {
		return { kind: "NOT_GENERATED" };
	}

	const object = await mediaStorageRepository.get({ key: media.thumbnailKey });

	return {
		kind: "OK",
		data: {
			body: new Uint8Array(await new Response(object.body).arrayBuffer()),
			contentType: object.contentType,
		},
	};
};
