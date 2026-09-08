// In scope: fetching one media object's thumbnail out of storage
// Out of scope: validating the id, HTTP status codes, generating a thumbnail
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";

/** undefined until the sync has generated one; the screen falls back to a placeholder. */
export const getThumbnailOperation = async (
	mediaId: string,
): Promise<
	{ body: Uint8Array<ArrayBuffer>; contentType: string } | undefined
> => {
	const media = await mediaObjectRepository.findById(mediaId);

	if (!media?.thumbnailKey) {
		return undefined;
	}

	const object = await mediaStorageRepository.get({ key: media.thumbnailKey });

	return {
		body: new Uint8Array(await new Response(object.body).arrayBuffer()),
		contentType: object.contentType,
	};
};
