// In scope: reading one media object's original out of storage, whole or by range
// Out of scope: validating the id, HTTP status codes, deciding between attachment and inline
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

export interface MediaFile {
	/** Handed to the response as it comes back from storage, so a large video never lands in memory. */
	body: ReadableStream<Uint8Array>;
	contentType: string;
	/** What `body` carries — the length of the range for a partial read, not of the whole object. */
	byteSize: number;
	/** Only for a partial read; passed through to the response as it stands. */
	contentRange: string | undefined;
	isPartial: boolean;
	fileName: string;
	etag: string;
}

/**
 * A trashed object is readable too: it is listed on the trash's own side, and what to restore can't be
 * judged without opening it.
 * NOT_MODIFIED when the caller already holds this content; storage is never read then.
 *
 * `range` is the request's Range header, passed to storage as it stands.
 * `knownEtags` are the etags the caller already holds, with the wire's quoting taken off.
 */
export const getMediaFileOperation = async (input: {
	mediaId: string;
	range: string | undefined;
	knownEtags: string[];
}): Promise<
	OperationResult<
		MediaFile,
		{ kind: "NOT_FOUND" } | { kind: "NOT_MODIFIED"; etag: string }
	>
> => {
	const media = await mediaObjectRepository.findById(input.mediaId);

	if (!media) {
		return { kind: "NOT_FOUND" };
	}

	// A range request asks for part of a representation the caller is already reading, so answering
	// 304 there would leave it without the part it asked for
	if (!input.range && input.knownEtags.includes(media.etag)) {
		return { kind: "NOT_MODIFIED", etag: media.etag };
	}

	const object = await mediaStorageRepository.get({
		key: media.objectKey,
		range: input.range,
	});

	return {
		kind: "OK",
		data: {
			body: object.body,
			// The type resolved from the extension when the object was taken in, rather than what
			// storage reports: a <video> plays nothing that comes back as application/octet-stream
			contentType: media.contentType,
			byteSize: object.byteSize,
			contentRange: object.contentRange,
			isPartial: object.isPartial,
			fileName: media.fileName,
			etag: media.etag,
		},
	};
};
