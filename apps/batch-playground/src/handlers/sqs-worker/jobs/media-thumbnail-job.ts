// In scope: generating one message's thumbnail, and moving the media out of the pending area either way
// Out of scope: how ffmpeg is called, validating the SQS event, sending messages, job dispatch
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { probeMedia } from "@eskra-aws-playground/libs-media/ffmpeg/media-probe.js";
import { generateThumbnail } from "@eskra-aws-playground/libs-media/ffmpeg/thumbnail-generator.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type { RelocateMediaObjectInput } from "@eskra-aws-playground/repositories/media/media-object/types.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import {
	MEDIA_THUMBNAIL_MAX_RECEIVE_COUNT,
	type MediaThumbnailMessage,
} from "@eskra-aws-playground/shared-domains/contracts/media-jobs.js";
import {
	FAILED_PREFIX,
	INBOX_PREFIX,
	PENDING_PREFIX,
	THUMBNAIL_PREFIX,
} from "@eskra-aws-playground/shared-domains/contracts/media-storage-layout.js";
import { extractLogicalPath } from "@eskra-aws-playground/shared-domains/protocols/media-object-key.js";

const THUMBNAIL_CONTENT_TYPE = "image/webp";

/**
 * Copies the object under `prefix`, drops the original, and reports where it landed.
 * A copy can come back with a different etag than the original had (a multipart upload does), so the
 * destination is re-read — registering the source's etag would make the next sync see replaced content.
 */
const moveObject = async (
	sourceKey: string,
	prefix: string,
): Promise<Omit<RelocateMediaObjectInput, "id">> => {
	const destinationKey = `${prefix}/${basename(sourceKey)}`;

	if (await mediaStorageRepository.headIfExists(destinationKey)) {
		throw new Error(`移動先の key が既に埋まっています: ${destinationKey}`);
	}

	await mediaStorageRepository.copy({ sourceKey, destinationKey });
	await mediaStorageRepository.delete(sourceKey);

	const moved = await mediaStorageRepository.head(destinationKey);

	return {
		objectKey: destinationKey,
		logicalPath: extractLogicalPath(destinationKey),
		byteSize: moved.byteSize,
		etag: moved.etag,
		syncedAt: new Date(),
	};
};

/**
 * Makes a webp thumbnail from the original, puts it in R2, and records it in the DB.
 * Media waiting under the pending prefix moves on once it has a thumbnail; media already filed into a
 * folder is only ever regenerated in place, so a replaced file is never pulled out of its folder.
 */
export const mediaThumbnailJob = async (
	message: MediaThumbnailMessage,
	receiveCount: number,
): Promise<void> => {
	const isPending = message.objectKey.startsWith(`${PENDING_PREFIX}/`);
	// Lambda's ephemeral storage is raised and /tmp is the work area, so even a large video fits
	const workDir = await mkdtemp(join(tmpdir(), "media-thumbnail-"));

	try {
		const sourcePath = join(workDir, "source");
		const thumbnailPath = join(workDir, "thumbnail.webp");
		const object = await mediaStorageRepository.get({
			key: message.objectKey,
		});

		await pipeline(
			Readable.fromWeb(object.body),
			createWriteStream(sourcePath),
		);

		const probe = await probeMedia(sourcePath);
		await generateThumbnail({
			sourcePath,
			destinationPath: thumbnailPath,
			durationMs: probe.durationMs,
		});

		const thumbnailKey = `${THUMBNAIL_PREFIX}/${message.mediaId}.webp`;
		await mediaStorageRepository.upload({
			key: thumbnailKey,
			body: await readFile(thumbnailPath),
			contentType: THUMBNAIL_CONTENT_TYPE,
		});

		const location = isPending
			? await moveObject(message.objectKey, INBOX_PREFIX)
			: undefined;
		const recorded = await mediaObjectRepository.updateThumbnail({
			id: message.mediaId,
			thumbnailKey,
			width: probe.width,
			height: probe.height,
			durationMs: probe.durationMs,
			location,
		});

		// With the row gone mid-generation there is nowhere to record it, so the thumbnail is removed too
		if (recorded === 0) {
			await mediaStorageRepository.delete(thumbnailKey);
		}
	} catch (error) {
		// The DLQ takes this message after the last delivery. Left under the pending prefix, every later
		// sync would ask for generation again, so it moves aside — and a failure moving it must not
		// replace the error that got us here
		if (isPending && receiveCount >= MEDIA_THUMBNAIL_MAX_RECEIVE_COUNT) {
			const location = await moveObject(message.objectKey, FAILED_PREFIX).catch(
				() => {
					return undefined;
				},
			);

			if (location) {
				await mediaObjectRepository
					.relocateMany([{ id: message.mediaId, ...location }])
					.catch(() => {
						return undefined;
					});
			}
		}

		throw error;
	} finally {
		await rm(workDir, { recursive: true, force: true });
	}
};
