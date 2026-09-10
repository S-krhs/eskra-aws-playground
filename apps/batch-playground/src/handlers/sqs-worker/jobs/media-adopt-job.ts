// In scope: giving one object placed from outside this app a UUID, moving it to an _inbox key, registering it and asking for its thumbnail
// Out of scope: deciding that a key needs taking in, scanning storage, generating the thumbnail itself, job dispatch
import { createHash } from "node:crypto";
import { basename, extname } from "node:path";
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { MediaAdoptMessage } from "@eskra-aws-playground/shared-domains/media/jobs/adopt-message.js";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/media/jobs/names.js";
import type { MediaThumbnailMessage } from "@eskra-aws-playground/shared-domains/media/jobs/thumbnail-message.js";
import { resolveContentType } from "@eskra-aws-playground/shared-domains/media/storage/content-type.js";
import { buildMediaObjectMetadata } from "@eskra-aws-playground/shared-domains/media/storage/object-metadata.js";
import { Resource } from "sst/resource";

/**
 * The id has to come out the same on a redelivery, so a copy that already landed is recognised instead
 * of duplicated. The modified time is in the hash because a file deleted and put back under the same
 * name is a different object that needs an id of its own.
 */
const resolveMediaId = (objectKey: string, modifiedAt: Date): string => {
	const bytes = createHash("sha256")
		.update(`${objectKey}\n${modifiedAt.toISOString()}`)
		.digest();
	// Version 8 (custom) and the RFC variant, so what goes in the uuid column is a well-formed one
	bytes[6] = (bytes[6] & 0x0f) | 0x80;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = bytes.subarray(0, 16).toString("hex");

	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20, 32),
	].join("-");
};

/**
 * A Copy attaches the metadata, then a Delete removes the original. Every step is repeatable, so a
 * redelivery after any crash converges on one object and one row: the id comes from the source rather
 * than at random, `copyIntoArea` lands a retry back on the object it already made, and `insertMany`
 * passes over an id that is already registered. Crashing between the Delete and the insert leaves the
 * copy with no row, which the next sync registers from the metadata it carries.
 *
 * The thumbnail is asked for here rather than left to the next sync, so it is on the queue as soon as
 * the row exists rather than up to a sync interval later.
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

	const mediaId = resolveMediaId(message.objectKey, source.lastModified);
	const originalName = basename(message.objectKey);
	// What the sync decided this was media by, rather than the header whoever put it there chose
	const contentType = resolveContentType(extname(message.objectKey));

	if (!contentType) {
		throw new Error(
			`取り込み対象の拡張子が許可されていません: ${extname(message.objectKey)}`,
		);
	}
	const copied = await mediaStorageRepository.copyIntoArea({
		sourceKey: message.objectKey,
		area: "inbox",
		modifiedAt: source.lastModified,
		extension: extname(message.objectKey),
		metadata: buildMediaObjectMetadata({ mediaId, originalName }),
		contentType,
	});

	await mediaStorageRepository.delete(message.objectKey);

	const syncedAt = new Date();

	await mediaObjectRepository.insertMany([
		{
			id: mediaId,
			objectKey: copied.key,
			logicalPath: copied.logicalPath,
			fileName: originalName,
			contentType,
			byteSize: copied.byteSize,
			etag: copied.etag,
			uploadedAt: source.lastModified,
			syncedAt,
		},
	]);

	// A send that fails leaves the row with no thumbnail recorded, which the next sync asks for again
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
