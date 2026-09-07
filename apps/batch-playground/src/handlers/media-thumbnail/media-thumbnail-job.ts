// In scope: SQS message ごとにサムネイルを生成し、R2 と DB へ反映する
// Out of scope: ffmpeg の呼び出し方、message の送信、同期の差分判定
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createR2Client } from "@eskra-aws-playground/integration-r2/r2-client.js";
import { r2ObjectStore } from "@eskra-aws-playground/integration-r2/r2-object-store.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import { THUMBNAIL_PREFIX } from "@eskra-aws-playground/shared-domains/contracts/media-storage-layout.js";
import { probeMedia } from "@/features/media-thumbnail/media-probe.js";
import { generateThumbnail } from "@/features/media-thumbnail/thumbnail-generator.js";
import { mediaThumbnailMessageSchema } from "@/shared/media-thumbnail-message.js";
import { getMediaSyncSettings } from "../media-sync/runtime-settings.js";

const logger = createBatchLogger("media-thumbnail");

const THUMBNAIL_CONTENT_TYPE = "image/webp";

/** SQS の部分応答。失敗した message だけを再配信させる。 */
export interface MediaThumbnailResponse {
	batchItemFailures: { itemIdentifier: string }[];
}

const sqsEventShape = (
	event: unknown,
): { messageId: string; body: string }[] => {
	const records = (event as { Records?: unknown }).Records;

	if (!Array.isArray(records)) {
		throw new Error("SQS event の形式が不正です");
	}

	return records as { messageId: string; body: string }[];
};

const generateForMessage = async (
	body: string,
	settings: ReturnType<typeof getMediaSyncSettings>,
): Promise<void> => {
	const message = mediaThumbnailMessageSchema.parse(JSON.parse(body));
	const client = createR2Client(settings.credentials);
	// 大きい動画は /tmp を使う。Lambda の ephemeral storage を上げて対応する
	const workDir = await mkdtemp(join(tmpdir(), "media-thumbnail-"));

	try {
		const sourcePath = join(workDir, "source");
		const thumbnailPath = join(workDir, "thumbnail.webp");
		const object = await r2ObjectStore.get(client, {
			bucket: settings.bucket,
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
		await r2ObjectStore.upload(client, {
			bucket: settings.bucket,
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

		// 生成中に行が消えていた場合、記録先が無いので上げた webp も残さない
		if (recorded === 0) {
			await r2ObjectStore.delete(client, {
				bucket: settings.bucket,
				key: thumbnailKey,
			});
		}
	} finally {
		await rm(workDir, { recursive: true, force: true });
	}
};

/** SQS event を受け取り、message ごとにサムネイルを生成する。 */
export const mediaThumbnailJob = async (
	event: unknown,
): Promise<MediaThumbnailResponse> => {
	const settings = getMediaSyncSettings();
	const batchItemFailures: { itemIdentifier: string }[] = [];

	for (const record of sqsEventShape(event)) {
		try {
			await generateForMessage(record.body, settings);
		} catch (error) {
			logger.failure(error, { messageId: record.messageId });
			batchItemFailures.push({ itemIdentifier: record.messageId });
		}
	}

	return { batchItemFailures };
};
