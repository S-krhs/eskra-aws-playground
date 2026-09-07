// In scope: message 1 件分のサムネイルを生成し、R2 と DB へ反映する
// Out of scope: ffmpeg の呼び出し方、SQS event の検証、message の送信、ジョブの振り分け
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
	createR2Client,
	parseR2CredentialsJson,
} from "@eskra-aws-playground/integration-r2/r2-client.js";
import { r2ObjectStore } from "@eskra-aws-playground/integration-r2/r2-object-store.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type { MediaThumbnailMessage } from "@eskra-aws-playground/shared-domains/contracts/media-thumbnail-message.js";
import { buildThumbnailKey } from "@eskra-aws-playground/shared-domains/protocols/media-object-key.js";
import { Resource } from "sst/resource";
import { probeMedia } from "@/features/media-thumbnail/media-probe.js";
import { generateThumbnail } from "@/features/media-thumbnail/thumbnail-generator.js";

const THUMBNAIL_CONTENT_TYPE = "image/webp";

/**
 * 原本から webp のサムネイルを作り、R2 へ置いて DB へ記録する。
 * 生成中に行が消えていた場合は、置いたサムネイルも残さない。
 */
export const mediaThumbnailJob = async (
	message: MediaThumbnailMessage,
): Promise<void> => {
	const bucket = process.env.MEDIA_BUCKET;

	if (!bucket) {
		throw new Error("MEDIA_BUCKET が設定されていません。");
	}

	const client = createR2Client(
		parseR2CredentialsJson(Resource.R2Credentials.value),
	);
	// 動画サイズが大きくても収まるよう、Lambda の ephemeral storage を増やしたうえで /tmp を作業領域に使う
	const workDir = await mkdtemp(join(tmpdir(), "media-thumbnail-"));

	try {
		const sourcePath = join(workDir, "source");
		const thumbnailPath = join(workDir, "thumbnail.webp");
		const object = await r2ObjectStore.get(client, {
			bucket: bucket,
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

		const thumbnailKey = buildThumbnailKey(message.mediaId);
		await r2ObjectStore.upload(client, {
			bucket: bucket,
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

		// 生成中に行が消えていた場合、記録先が無いので置いたサムネイルも残さない
		if (recorded === 0) {
			await r2ObjectStore.delete(client, {
				bucket: bucket,
				key: thumbnailKey,
			});
		}
	} finally {
		await rm(workDir, { recursive: true, force: true });
	}
};
