// In scope: the object-metadata keys a media object carries, and converting between that metadata and its identity
// Out of scope: talking to external storage, key construction, deciding where metadata is stored
import { z } from "zod";

export const MEDIA_ID_METADATA_KEY = "media-id";

export const ORIGINAL_NAME_METADATA_KEY = "original-name";

export interface MediaObjectMetadata {
	mediaId: string;
	originalName: string;
}

/** What S3-compatible storage allows for user-defined metadata, counting every key and value together. */
const METADATA_MAX_LENGTH = 2048;

/**
 * Metadata travels as an HTTP header and only ASCII survives, so the file name —
 * which may contain Japanese — is percent-encoded. Encoding costs a Japanese character nine
 * characters, and Windows allows 255 of them, so a long name is cut to fit the metadata budget.
 */
export const buildMediaObjectMetadata = (
	metadata: MediaObjectMetadata,
): Record<string, string> => {
	const originalNameBudget =
		METADATA_MAX_LENGTH -
		MEDIA_ID_METADATA_KEY.length -
		metadata.mediaId.length -
		ORIGINAL_NAME_METADATA_KEY.length;

	return {
		[MEDIA_ID_METADATA_KEY]: metadata.mediaId,
		[ORIGINAL_NAME_METADATA_KEY]: encodeOriginalName(
			metadata.originalName,
			originalNameBudget,
		),
	};
};

/**
 * Encodes character by character so a cut never lands inside an escape sequence or a surrogate pair.
 * The tail of an over-long name is dropped rather than the upload failing over it: the name is only
 * ever shown to a person, while the media-id is what identifies the object.
 */
const encodeOriginalName = (
	originalName: string,
	maxLength: number,
): string => {
	let encoded = "";

	for (const character of originalName) {
		const encodedCharacter = encodeURIComponent(character);

		if (encoded.length + encodedCharacter.length > maxLength) {
			break;
		}

		encoded += encodedCharacter;
	}

	return encoded;
};

const mediaIdSchema = z.uuid();

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
