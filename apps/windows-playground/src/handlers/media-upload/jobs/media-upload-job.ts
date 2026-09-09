// In scope: storing one file where it waits for its thumbnail, metadata included
// Out of scope: reading arguments, loading config, converting the path, the key it takes, deciding what to do on failure
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import { resolveContentType } from "@eskra-aws-playground/shared-domains/media/storage/content-type.js";
import { buildMediaObjectMetadata } from "@eskra-aws-playground/shared-domains/media/storage/object-metadata.js";

export interface UploadedMedia {
	objectKey: string;
	mediaId: string;
	byteSize: number;
}

/**
 * Stores a file where it waits for its thumbnail. The UUID and original file name only go into object
 * metadata — nothing is written to the DB, which the sync job takes care of later.
 * `filePath` is the path as WSL sees it.
 */
export const mediaUploadJob = async (
	filePath: string,
): Promise<UploadedMedia> => {
	const stats = await stat(filePath);

	if (!stats.isFile()) {
		throw new Error("ファイルではありません");
	}

	const extension = extname(filePath);
	const contentType = resolveContentType(extension);

	if (!contentType) {
		throw new Error(`対象外の拡張子です: ${extension || "(拡張子なし)"}`);
	}

	const mediaId = randomUUID();
	const stored = await mediaStorageRepository.uploadIntoArea({
		area: "pending",
		modifiedAt: stats.mtime,
		extension,
		// Streamed, so a large video never sits in memory
		body: createReadStream(filePath),
		contentType,
		metadata: buildMediaObjectMetadata({
			mediaId,
			originalName: basename(filePath),
		}),
	});

	return { objectKey: stored.key, mediaId, byteSize: stats.size };
};
