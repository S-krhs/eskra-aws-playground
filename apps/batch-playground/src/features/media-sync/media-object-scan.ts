// In scope: picking the media objects out of everything the storage holds
// Out of scope: paging the listing, reading metadata, matching against the DB, thumbnail generation

import { extname } from "node:path";
import { THUMBNAIL_PREFIX } from "@eskra-aws-playground/repositories/media/_shared/literals/storage-prefix.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import { resolveContentType } from "@eskra-aws-playground/shared-domains/media/content-type.js";
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

export const scanMediaObjects = async (): Promise<ScannedObject[]> => {
	const objects = await mediaStorageRepository.listAll();

	return objects.filter((object) => {
		return isMediaKey(object.key);
	});
};
