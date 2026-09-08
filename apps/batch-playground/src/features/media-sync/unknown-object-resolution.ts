// In scope: reading an unknown key's metadata, sorting it into new / moved / adopted, and building the R2 and DB inputs
// Out of scope: walking R2, writing to the DB, thumbnail generation, recording progress
import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import type {
	InsertMediaObjectInput,
	RelocateMediaObjectInput,
} from "@eskra-aws-playground/repositories/media/media-object/types.js";
import { mediaStorageRepository } from "@eskra-aws-playground/repositories/media/media-storage/repository.js";
import { INBOX_PREFIX } from "@eskra-aws-playground/shared-domains/contracts/media-storage-layout.js";
import {
	buildMediaObjectKey,
	extractLogicalPath,
} from "@eskra-aws-playground/shared-domains/protocols/media-object-key.js";
import {
	buildMediaObjectMetadata,
	type MediaObjectMetadata,
	parseMediaObjectMetadata,
} from "@eskra-aws-playground/shared-domains/protocols/media-object-metadata.js";
import type { ScannedObject } from "./sync-plan.js";

// Awaiting HeadObject one at a time would never finish a first run of 100k objects, so they go out in batches
const HEAD_CONCURRENCY = 20;

// Files sharing a modified time are rare; going past this points at a skew in what is being taken in
const MAX_KEY_SEQUENCE = 100;

export type UnknownObjectDecision =
	| { kind: "relocate"; mediaId: string }
	| { kind: "insert"; mediaId: string; originalName: string }
	| { kind: "duplicate"; mediaId: string }
	| { kind: "adopt" };

/** The registered ids an unknown key is judged against; `missing` is a subset of `all`. */
export interface RegisteredMediaIds {
	all: ReadonlySet<string>;
	/** Registered ids that the storage listing didn't turn up. */
	missing: ReadonlySet<string>;
}

/** One pass's data. Everything here is a value; the progress hook is a separate argument. */
export interface UnknownObjectResolutionInput {
	objects: ScannedObject[];
	registeredIds: RegisteredMediaIds;
	/** Stamped on every row this pass produces, so one sync's rows share a time. */
	syncedAt: Date;
}

/** How far a pass has got. The counts keep rising until it returns, so they aren't a result. */
export interface UnknownObjectResolutionProgress {
	insertCount: number;
	relocationCount: number;
}

/** The resolution of the unknown keys: the inputs to write to the DB, plus how many couldn't be handled. */
export interface ResolvedUnknownObjects {
	inserts: InsertMediaObjectInput[];
	relocations: RelocateMediaObjectInput[];
	skippedCount: number;
}

/**
 * Decides what to do with an unknown key from its metadata and the registered ids.
 * A copy carries the original's metadata along, so the same media-id can sit on two keys — a relocate
 * is only called once the original key is confirmed gone. Skip that check and objectKey flips between
 * the two on every run.
 */
export const decideUnknownObject = (
	metadata: MediaObjectMetadata | undefined,
	registeredIds: RegisteredMediaIds,
): UnknownObjectDecision => {
	if (!metadata) {
		return { kind: "adopt" };
	}

	if (registeredIds.missing.has(metadata.mediaId)) {
		return { kind: "relocate", mediaId: metadata.mediaId };
	}

	// The same media-id appearing while the original key is still there means it was copied
	if (registeredIds.all.has(metadata.mediaId)) {
		return { kind: "duplicate", mediaId: metadata.mediaId };
	}

	return {
		kind: "insert",
		mediaId: metadata.mediaId,
		originalName: metadata.originalName,
	};
};

const resolveAvailableInboxKey = async (
	modifiedAt: Date,
	extension: string,
): Promise<string> => {
	for (let sequence = 0; sequence <= MAX_KEY_SEQUENCE; sequence += 1) {
		const key = buildMediaObjectKey({
			logicalPath: INBOX_PREFIX,
			modifiedAt,
			extension,
			sequence: sequence === 0 ? undefined : sequence + 1,
		});

		if (!(await mediaStorageRepository.headIfExists(key))) {
			return key;
		}
	}

	throw new Error(
		`同じ更新日時の key が ${MAX_KEY_SEQUENCE} 件を超えて埋まっています`,
	);
};

/**
 * Assigns a UUID to an object placed from outside this app and moves it to an _inbox key.
 * A Copy attaches the metadata, then a Delete removes the original; if the Delete fails, the copy is
 * deleted to undo it. Leaving the original in place means the next sync takes it in again, producing
 * two UUIDs and two rows for the same content.
 */
const adoptObject = async (input: {
	object: ScannedObject;
	contentType: string;
	syncedAt: Date;
}): Promise<InsertMediaObjectInput> => {
	const mediaId = randomUUID();
	const originalName = basename(input.object.key);
	const destinationKey = await resolveAvailableInboxKey(
		input.object.lastModified,
		extname(input.object.key),
	);

	await mediaStorageRepository.copy({
		sourceKey: input.object.key,
		destinationKey,
		metadata: buildMediaObjectMetadata({ mediaId, originalName }),
		contentType: input.contentType,
	});

	// A copy's etag doesn't always match the original's (when the original went up as multipart).
	// Registering the source's etag would make the next sync read it as a replacement and rebuild the thumbnail
	const copied = await mediaStorageRepository.head(destinationKey);

	try {
		await mediaStorageRepository.delete(input.object.key);
	} catch (error) {
		await mediaStorageRepository.delete(destinationKey);

		throw error;
	}

	return {
		id: mediaId,
		objectKey: destinationKey,
		logicalPath: extractLogicalPath(destinationKey),
		fileName: originalName,
		contentType: input.contentType,
		byteSize: copied.byteSize,
		etag: copied.etag,
		uploadedAt: input.object.lastModified,
		syncedAt: input.syncedAt,
	};
};

/**
 * HeadObjects each unknown key and sorts it. ListObjectsV2 returns no custom metadata, which is why
 * HeadObject is called here and nowhere else.
 */
export const resolveUnknownObjects = async (
	input: UnknownObjectResolutionInput,
	/** Called once per batch, since a first run takes minutes to get through. */
	onProgress?: (progress: UnknownObjectResolutionProgress) => Promise<void>,
): Promise<ResolvedUnknownObjects> => {
	const inserts: InsertMediaObjectInput[] = [];
	const relocations: RelocateMediaObjectInput[] = [];
	let skippedCount = 0;

	for (
		let offset = 0;
		offset < input.objects.length;
		offset += HEAD_CONCURRENCY
	) {
		const chunk = input.objects.slice(offset, offset + HEAD_CONCURRENCY);
		const resolved = await Promise.all(
			chunk.map(async (object) => {
				// An object gone since the listing must not fail the whole sync
				const head = await mediaStorageRepository.headIfExists(object.key);

				return { object, head };
			}),
		);

		for (const { object, head } of resolved) {
			if (!head) {
				continue;
			}

			const decision = decideUnknownObject(
				parseMediaObjectMetadata(head.metadata),
				input.registeredIds,
			);

			if (decision.kind === "relocate") {
				relocations.push({
					id: decision.mediaId,
					objectKey: object.key,
					logicalPath: extractLogicalPath(object.key),
					byteSize: object.byteSize,
					etag: object.etag,
					syncedAt: input.syncedAt,
				});
				continue;
			}

			// A copy still has its original alive, so there's no telling which one to keep
			if (decision.kind === "duplicate") {
				skippedCount += 1;
				continue;
			}

			if (decision.kind === "insert") {
				inserts.push({
					id: decision.mediaId,
					objectKey: object.key,
					logicalPath: extractLogicalPath(object.key),
					fileName: decision.originalName || basename(object.key),
					contentType: head.contentType,
					byteSize: object.byteSize,
					etag: object.etag,
					uploadedAt: object.lastModified,
					syncedAt: input.syncedAt,
				});
				continue;
			}

			// Adopting rewrites R2, so it runs one at a time rather than in parallel.
			// One failure doesn't fail the whole sync; it carries over to the next run
			try {
				inserts.push(
					await adoptObject({
						object,
						contentType: head.contentType,
						syncedAt: input.syncedAt,
					}),
				);
			} catch {
				skippedCount += 1;
			}
		}

		await onProgress?.({
			insertCount: inserts.length,
			relocationCount: relocations.length,
		});
	}

	return { inserts, relocations, skippedCount };
};
