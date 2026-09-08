// In scope: storing one file into R2's _inbox, key-collision avoidance and metadata included
// Out of scope: reading arguments, loading config, writing to the DB, thumbnail generation
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { R2Client } from "@eskra-aws-playground/integration-r2/r2-client.js";
import { r2ObjectStore } from "@eskra-aws-playground/integration-r2/r2-object-store.js";
import { resolveContentType } from "@eskra-aws-playground/shared-domains/contracts/media-content-type.js";
import { INBOX_PREFIX } from "@eskra-aws-playground/shared-domains/contracts/media-storage-layout.js";
import { buildMediaObjectKey } from "@eskra-aws-playground/shared-domains/protocols/media-object-key.js";
import { buildMediaObjectMetadata } from "@eskra-aws-playground/shared-domains/protocols/media-object-metadata.js";

// Files sharing a modified millisecond are rare; going past this points at a misconfiguration
const MAX_KEY_SEQUENCE = 100;

export interface UploadedMedia {
	objectKey: string;
	mediaId: string;
	byteSize: number;
}

/** `filePath` is the path as WSL sees it. */
export interface UploadMediaFileInput {
	bucket: string;
	filePath: string;
}

const resolveAvailableKey = async (
	client: R2Client,
	bucket: string,
	modifiedAt: Date,
	extension: string,
): Promise<string> => {
	for (let sequence = 0; sequence <= MAX_KEY_SEQUENCE; sequence += 1) {
		const objectKey = buildMediaObjectKey({
			logicalPath: INBOX_PREFIX,
			modifiedAt,
			extension,
			// The first key carries no counter; a collision starts numbering at -2
			sequence: sequence === 0 ? undefined : sequence + 1,
		});

		if (
			!(await r2ObjectStore.headIfExists(client, { bucket, key: objectKey }))
		) {
			return objectKey;
		}
	}

	throw new Error(
		`同じ更新日時の key が ${MAX_KEY_SEQUENCE} 件を超えて埋まっています`,
	);
};

/**
 * Stores a file into R2's _inbox. The UUID and original file name only go into object metadata —
 * nothing is written to the DB, which the sync job takes care of later.
 */
export const uploadMediaFile = async (
	client: R2Client,
	input: UploadMediaFileInput,
): Promise<UploadedMedia> => {
	const stats = await stat(input.filePath);

	if (!stats.isFile()) {
		throw new Error("ファイルではありません");
	}

	const extension = extname(input.filePath);
	const contentType = resolveContentType(extension);

	if (!contentType) {
		throw new Error(`対象外の拡張子です: ${extension || "(拡張子なし)"}`);
	}

	const objectKey = await resolveAvailableKey(
		client,
		input.bucket,
		stats.mtime,
		extension,
	);
	const mediaId = randomUUID();

	await r2ObjectStore.upload(client, {
		bucket: input.bucket,
		key: objectKey,
		// Streamed, so a large video never sits in memory
		body: createReadStream(input.filePath),
		contentType,
		metadata: buildMediaObjectMetadata({
			mediaId,
			originalName: basename(input.filePath),
		}),
	});

	return { objectKey, mediaId, byteSize: stats.size };
};
