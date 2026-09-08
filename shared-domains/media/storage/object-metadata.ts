// In scope: converting between R2 object metadata and a media object's identity
// Out of scope: the metadata keys and their types, talking to R2, key construction, deciding where metadata is stored
import {
	MEDIA_ID_METADATA_KEY,
	type MediaObjectMetadata,
	mediaIdSchema,
	ORIGINAL_NAME_METADATA_KEY,
} from "./schema.js";

/**
 * Metadata travels as an HTTP header and only ASCII survives, so the file name —
 * which may contain Japanese — is percent-encoded.
 */
export const buildMediaObjectMetadata = (
	metadata: MediaObjectMetadata,
): Record<string, string> => {
	return {
		[MEDIA_ID_METADATA_KEY]: metadata.mediaId,
		[ORIGINAL_NAME_METADATA_KEY]: encodeURIComponent(metadata.originalName),
	};
};

/**
 * Anyone can write metadata, so a media-id that does not read as a UUID is treated as absent —
 * feeding it straight into the primary key would fail every later insert.
 */
export const parseMediaObjectMetadata = (
	metadata: Record<string, string> | undefined,
): MediaObjectMetadata | undefined => {
	const mediaId = metadata?.[MEDIA_ID_METADATA_KEY];

	if (!mediaId || !mediaIdSchema.safeParse(mediaId).success) {
		return undefined;
	}

	const originalName = metadata?.[ORIGINAL_NAME_METADATA_KEY];

	return {
		mediaId,
		originalName: originalName ? safeDecode(originalName) : "",
	};
};

const safeDecode = (value: string): string => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};
