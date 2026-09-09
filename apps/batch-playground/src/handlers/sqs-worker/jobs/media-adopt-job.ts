// In scope: giving one object placed from outside this app a UUID, moving it to an _inbox key, registering it and asking for its thumbnail
// Out of scope: deciding that a key needs taking in, scanning storage, generating the thumbnail itself, job dispatch
import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { MediaAdoptMessage } from "@eskra-aws-playground/shared-domains/media/jobs/adopt-message.js";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/media/jobs/names.js";
import type { MediaThumbnailMessage } from "@eskra-aws-playground/shared-domains/media/jobs/thumbnail-message.js";
import { buildMediaObjectMetadata } from "@eskra-aws-playground/shared-domains/media/storage/object-metadata.js";
import { Resource } from "sst/resource";

/**
 * A Copy attaches the metadata, then a Delete removes the original; if the Delete fails, the copy is
 * deleted to undo it. Leaving the original in place means the next sync takes it in again, producing
 * two UUIDs and two rows for the same content.
 *
 * The thumbnail is asked for here rather than left to the next sync. A sync only asks for keys under
 * the pending prefix, and this lands the object under _inbox with its content unchanged, so no later
 * sync would ever see a reason to ask.
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
	const copied = await mediaStorageRepository.copyIntoArea({
		sourceKey: message.objectKey,
		area: "inbox",
		modifiedAt: source.lastModified,
		extension: extname(message.objectKey),
		metadata: buildMediaObjectMetadata({ mediaId, originalName }),
		contentType: source.contentType,
	});

	try {
		await mediaStorageRepository.delete(message.objectKey);
	} catch (error) {
		await mediaStorageRepository.delete(copied.key);

		throw error;
	}

	const syncedAt = new Date();

	await mediaObjectRepository.insertMany([
		{
			id: mediaId,
			objectKey: copied.key,
			logicalPath: copied.logicalPath,
			fileName: originalName,
			contentType: source.contentType,
			byteSize: copied.byteSize,
			etag: copied.etag,
			uploadedAt: source.lastModified,
			syncedAt,
		},
	]);

	// The row is in place before this, so a redelivery after a failed send finds the source gone and
	// stops above — the object keeps its row and goes without a thumbnail rather than being taken in twice
	const sender = new SqsMessageSender(Resource.MediaThumbnailQueue.url);

	await sender.sendMessages([
		{
			id: mediaId,
			body: {
				job: mediaJobNames.mediaThumbnail,
				mediaId,
				objectKey: copied.key,
			} satisfies MediaThumbnailMessage,
		},
	]);
};
