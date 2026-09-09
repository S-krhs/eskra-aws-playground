// In scope: generating one message's thumbnail, and moving the media out of the pending area either way
// Out of scope: how ffmpeg is called, validating the SQS event, sending messages, job dispatch
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { probeMedia } from "@eskra-aws-playground/libs-media/ffmpeg/media-probe.js";
import { generateThumbnail } from "@eskra-aws-playground/libs-media/ffmpeg/thumbnail-generator.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type { RelocateMediaObjectInput } from "@eskra-aws-playground/repositories/media/media-object/types.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import {
	MEDIA_THUMBNAIL_MAX_RECEIVE_COUNT,
	type MediaThumbnailMessage,
} from "@eskra-aws-playground/shared-domains/media/jobs/thumbnail-message.js";

/**
 * Makes a webp thumbnail from the original, puts it in R2, and records it in the DB.
 * Media waiting under the pending prefix moves on once it has a thumbnail; media already filed into a
 * folder is only ever regenerated in place, so a replaced file is never pulled out of its folder.
 */
export const mediaThumbnailJob = async (
	message: MediaThumbnailMessage,
	receiveCount: number,
): Promise<void> => {
	const isPending =
		mediaStorageRepository.resolveArea(message.objectKey) === "pending";
	// Lambda's ephemeral storage is raised and /tmp is the work area, so even a large video fits
	const workDir = await mkdtemp(join(tmpdir(), "media-thumbnail-"));

	try {
		const sourcePath = join(workDir, "source");
		const object = await mediaStorageRepository.get({
			key: message.objectKey,
		});

		// writeFile consumes the stream chunk by chunk, so a large video never lands in memory
		await writeFile(sourcePath, object.body);

		const probe = await probeMedia(sourcePath);
		const thumbnail = await generateThumbnail({
			sourcePath,
			durationMs: probe.durationMs,
		});

		await mediaStorageRepository.uploadThumbnail({
			mediaId: message.mediaId,
			body: thumbnail,
		});

		let location: Omit<RelocateMediaObjectInput, "id"> | undefined;

		if (isPending) {
			const moved = await mediaStorageRepository.moveIntoArea({
				key: message.objectKey,
				area: "inbox",
			});

			location = {
				objectKey: moved.key,
				logicalPath: moved.logicalPath,
				byteSize: moved.byteSize,
				etag: moved.etag,
				syncedAt: new Date(),
			};
		}

		const recorded = await mediaObjectRepository.updateThumbnail({
			id: message.mediaId,
			width: probe.width,
			height: probe.height,
			durationMs: probe.durationMs,
			location,
		});

		// With the row gone mid-generation there is nowhere to record it, so the thumbnail is removed too
		if (recorded === 0) {
			await mediaStorageRepository.deleteThumbnail(message.mediaId);
		}
	} catch (error) {
		// The DLQ takes this message after the last delivery. Left under the pending prefix, every later
		// sync would ask for generation again, so it moves aside — and a failure moving it must not
		// replace the error that got us here
		if (isPending && receiveCount >= MEDIA_THUMBNAIL_MAX_RECEIVE_COUNT) {
			try {
				const moved = await mediaStorageRepository.moveIntoArea({
					key: message.objectKey,
					area: "failed",
				});

				await mediaObjectRepository.relocateMany([
					{
						id: message.mediaId,
						objectKey: moved.key,
						logicalPath: moved.logicalPath,
						byteSize: moved.byteSize,
						etag: moved.etag,
						syncedAt: new Date(),
					},
				]);
			} catch {
				// Best effort — the next sync finds it under the pending prefix again either way
			}
		}

		throw error;
	} finally {
		await rm(workDir, { recursive: true, force: true });
	}
};
