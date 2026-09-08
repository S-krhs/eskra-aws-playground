// In scope: enumerating every media object in R2, paging and excluding non-media prefixes
// Out of scope: reading metadata, matching against the DB, thumbnail generation

import { extname } from "node:path";
import type { R2Client } from "@eskra-aws-playground/integration-r2/r2-client.js";
import { r2ObjectStore } from "@eskra-aws-playground/integration-r2/r2-object-store.js";
import { resolveContentType } from "@eskra-aws-playground/shared-domains/contracts/media-content-type.js";
import { THUMBNAIL_PREFIX } from "@eskra-aws-playground/shared-domains/contracts/media-storage-layout.js";
import type { ScannedObject } from "./sync-plan.js";

const THUMBNAIL_KEY_PREFIX = `${THUMBNAIL_PREFIX}/`;

/**
 * Decides whether a key is media to take in. Thumbnails aren't media themselves and are excluded,
 * as are extensions off the list. Without that, text files and folder placeholders get taken in,
 * and thumbnail generation fails on them forever and keeps backing up the DLQ.
 */
export const isMediaKey = (key: string): boolean => {
	if (key.startsWith(THUMBNAIL_KEY_PREFIX)) {
		return false;
	}

	return resolveContentType(extname(key)) !== undefined;
};

/**
 * Enumerates every media object in the bucket, following continuationToken through 1000 keys per
 * response — around 100 requests even at 100k objects.
 */
export const scanMediaObjects = async (
	client: R2Client,
	bucket: string,
): Promise<ScannedObject[]> => {
	const objects: ScannedObject[] = [];
	let continuationToken: string | undefined;

	do {
		const page = await r2ObjectStore.list(client, {
			bucket,
			continuationToken,
		});

		for (const object of page.objects) {
			if (isMediaKey(object.key)) {
				objects.push(object);
			}
		}

		continuationToken = page.nextContinuationToken;
	} while (continuationToken);

	return objects;
};
