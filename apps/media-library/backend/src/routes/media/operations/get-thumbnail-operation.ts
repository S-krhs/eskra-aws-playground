// In scope: fetching one media object's thumbnail out of storage, and telling an unchanged one apart
// Out of scope: validating the id, HTTP status codes, generating a thumbnail
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

export interface Thumbnail {
	body: Uint8Array<ArrayBuffer>;
	contentType: string;
	/** Identifies the content the caller would receive, so an unchanged one can be answered without it. */
	etag: string;
}

/**
 * NOT_GENERATED until the sync has made one; the screen falls back to a placeholder.
 * NOT_MODIFIED when the caller already holds this content — the body is never read from storage then.
 *
 * `knownEtags` arrive with the wire's quoting already taken off.
 */
export const getThumbnailOperation = async (input: {
	mediaId: string;
	knownEtags: string[];
}): Promise<
	OperationResult<
		Thumbnail,
		{ kind: "NOT_GENERATED" } | { kind: "NOT_MODIFIED"; etag: string }
	>
> => {
	// Read past the trash on purpose: the trash is a listing of its own, and deciding what to restore
	// means seeing what is in it
	const media = await mediaObjectRepository.findById(input.mediaId);

	if (!media?.hasThumbnail) {
		return { kind: "NOT_GENERATED" };
	}

	// The object's etag stands in for the thumbnail's: a sync that finds new content under the same key
	// registers the new etag and clears the thumbnail, so the two only ever change together
	if (input.knownEtags.includes(media.etag)) {
		return { kind: "NOT_MODIFIED", etag: media.etag };
	}

	const object = await mediaStorageRepository.getThumbnail(input.mediaId);

	return {
		kind: "OK",
		data: {
			body: new Uint8Array(await new Response(object.body).arrayBuffer()),
			contentType: object.contentType,
			etag: media.etag,
		},
	};
};
