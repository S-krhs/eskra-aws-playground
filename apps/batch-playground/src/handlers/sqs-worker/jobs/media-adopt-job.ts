// In scope: giving one object placed from outside this app a UUID, moving it to an _inbox key and registering it
// Out of scope: deciding that a key needs taking in, scanning storage, thumbnail generation, job dispatch
import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import { INBOX_PREFIX } from "@eskra-aws-playground/repositories/media/_shared/literals/storage-prefix.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { MediaAdoptMessage } from "@eskra-aws-playground/shared-domains/media/jobs/adopt-message.js";
import {
	buildMediaObjectKey,
	extractLogicalPath,
} from "@eskra-aws-playground/shared-domains/media/storage/object-key.js";
import { buildMediaObjectMetadata } from "@eskra-aws-playground/shared-domains/media/storage/object-metadata.js";

// Files sharing a modified time are rare; going past this points at a skew in what is being taken in
const MAX_KEY_SEQUENCE = 100;

const resolveAvailableInboxKey = async (
	modifiedAt: Date,
	extension: string,
): Promise<string> => {
	for (let sequence = 0; sequence <= MAX_KEY_SEQUENCE; sequence += 1) {
		const key = buildMediaObjectKey({
			logicalPath: INBOX_PREFIX,
			modifiedAt,
			extension,
			sequence: sequence === 0 ? undefined : sequence + 1,
		});

		if (!(await mediaStorageRepository.headIfExists(key))) {
			return key;
		}
	}

	throw new Error(
		`同じ更新日時の key が ${MAX_KEY_SEQUENCE} 件を超えて埋まっています`,
	);
};

/**
 * Assigns a UUID to an object placed from outside this app and moves it to an _inbox key.
 * A Copy attaches the metadata, then a Delete removes the original; if the Delete fails, the copy is
 * deleted to undo it. Leaving the original in place means the next sync takes it in again, producing
 * two UUIDs and two rows for the same content.
 */
export const mediaAdoptJob = async (
	message: MediaAdoptMessage,
): Promise<void> => {
	// The source is gone once it has been taken in, so a redelivery — or a second sync that asked
	// again while this was in flight — finds nothing and stops here
	const source = await mediaStorageRepository.headIfExists(message.objectKey);

	if (!source) {
		return;
	}

	const mediaId = randomUUID();
	const originalName = basename(message.objectKey);
	const destinationKey = await resolveAvailableInboxKey(
		source.lastModified,
		extname(message.objectKey),
	);

	await mediaStorageRepository.copy({
		sourceKey: message.objectKey,
		destinationKey,
		metadata: buildMediaObjectMetadata({ mediaId, originalName }),
		contentType: source.contentType,
	});

	// A copy's etag doesn't always match the original's (when the original went up as multipart).
	// Registering the source's etag would make the next sync read it as a replacement and rebuild the thumbnail
	const copied = await mediaStorageRepository.head(destinationKey);

	try {
		await mediaStorageRepository.delete(message.objectKey);
	} catch (error) {
		await mediaStorageRepository.delete(destinationKey);

		throw error;
	}

	const syncedAt = new Date();

	await mediaObjectRepository.insertMany([
		{
			id: mediaId,
			objectKey: destinationKey,
			logicalPath: extractLogicalPath(destinationKey),
			fileName: originalName,
			contentType: source.contentType,
			byteSize: copied.byteSize,
			etag: copied.etag,
			uploadedAt: source.lastModified,
			syncedAt,
		},
	]);
};
