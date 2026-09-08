// In scope: generating one message's thumbnail and writing it to R2 and the DB
// Out of scope: how ffmpeg is called, validating the SQS event, sending messages, job dispatch
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import type { MediaThumbnailMessage } from "@eskra-aws-playground/shared-domains/contracts/media-jobs.js";
import { THUMBNAIL_PREFIX } from "@eskra-aws-playground/shared-domains/contracts/media-storage-layout.js";
import { probeMedia } from "@/features/media-thumbnail/media-probe.js";
import { generateThumbnail } from "@/features/media-thumbnail/thumbnail-generator.js";

const THUMBNAIL_CONTENT_TYPE = "image/webp";

/**
 * Makes a webp thumbnail from the original, puts it in R2, and records it in the DB.
 * If the row disappeared mid-generation, the thumbnail that was put there is removed too.
 */
export const mediaThumbnailJob = async (
	message: MediaThumbnailMessage,
): Promise<void> => {
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

		const recorded = await mediaObjectRepository.setThumbnail({
			id: message.mediaId,
			thumbnailKey,
			width: probe.width,
			height: probe.height,
			durationMs: probe.durationMs,
		});

		// With the row gone mid-generation there is nowhere to record it, so the thumbnail is removed too
		if (recorded === 0) {
			await mediaStorageRepository.delete(thumbnailKey);
		}
	} finally {
		await rm(workDir, { recursive: true, force: true });
	}
};
