// In scope: matching an R2 scan against the registered keys and classifying what the sync has to do
// Out of scope: talking to R2, reading metadata, writing to the DB, thumbnail generation
import type { MediaObjectSummary } from "@eskra-aws-playground/repositories/media/media-object/types.js";

export interface ScannedObject {
	key: string;
	byteSize: number;
	etag: string;
	lastModified: Date;
}

/** Media whose content was replaced under an unchanged key. */
export interface ChangedMediaObject {
	id: string;
	object: ScannedObject;
}

export interface MediaSyncPlan {
	/** Registered ids matching on both key and etag; only their last-seen time is updated. */
	unchangedIds: string[];
	/** Same key, different etag; dimensions and thumbnail get rebuilt. */
	changedObjects: ChangedMediaObject[];
	/** Keys absent from the DB; reading their metadata decides new versus moved. */
	unknownObjects: ScannedObject[];
	/** Ids in the DB but not in R2; deleted unless they turn out to be a move. */
	missingIds: string[];
}

/**
 * Matches the scan against the registered keys. It splits on key equality alone and leaves any
 * decision needing metadata to the caller. ListObjectsV2 returns no metadata, so nothing calls
 * HeadObject at this stage.
 */
export const buildMediaSyncPlan = (input: {
	scanned: ScannedObject[];
	known: MediaObjectSummary[];
}): MediaSyncPlan => {
	const knownByKey = new Map(
		input.known.map((media) => {
			return [media.objectKey, media];
		}),
	);

	const unchangedIds: string[] = [];
	const changedObjects: ChangedMediaObject[] = [];
	const unknownObjects: ScannedObject[] = [];

	for (const object of input.scanned) {
		const known = knownByKey.get(object.key);

		if (!known) {
			unknownObjects.push(object);
			continue;
		}

		// An overwrite under the same key changes only the etag
		if (known.etag === object.etag) {
			unchangedIds.push(known.id);
			continue;
		}

		changedObjects.push({ id: known.id, object });
	}

	const foundIds = new Set([
		...unchangedIds,
		...changedObjects.map((changed) => {
			return changed.id;
		}),
	]);
	const missingIds = input.known
		.filter((media) => {
			return !foundIds.has(media.id);
		})
		.map((media) => {
			return media.id;
		});

	return { unchangedIds, changedObjects, unknownObjects, missingIds };
};
