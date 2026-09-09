// In scope: registering, re-keying and deleting MediaObject rows, and reading them one at a time or by page
// Out of scope: reading/writing R2, key construction, tag and folder operations, thumbnail generation
import { getPrismaClient } from "../../client/prisma.js";
import { buildThumbnailKey } from "../_shared/formatter/object-key.js";
import type { MediaObjectRow } from "../_shared/virtual/media-object-row.js";
import type {
	FindMediaObjectPageInput,
	InsertMediaObjectInput,
	MediaObject,
	MediaObjectCursor,
	MediaObjectPage,
	MediaObjectSummary,
	RefreshMediaObjectInput,
	RelocateMediaObjectInput,
	UpdateThumbnailInput,
} from "./types.js";

const toMediaObject = (row: MediaObjectRow): MediaObject => {
	return {
		id: row.id,
		objectKey: row.objectKey,
		logicalPath: row.logicalPath,
		fileName: row.fileName,
		contentType: row.contentType,
		byteSize: Number(row.byteSize),
		etag: row.etag,
		width: row.width ?? undefined,
		height: row.height ?? undefined,
		durationMs: row.durationMs ?? undefined,
		hasThumbnail: row.thumbnailKey !== null,
		uploadedAt: row.uploadedAt,
		syncedAt: row.syncedAt,
		trashedAt: row.trashedAt ?? undefined,
	};
};

// Bulk operations are split at this size so a 100k-object sync never builds one enormous statement
const BULK_CHUNK_SIZE = 1_000;

const toChunks = <T>(items: T[]): T[][] => {
	const chunks: T[][] = [];

	for (let offset = 0; offset < items.length; offset += BULK_CHUNK_SIZE) {
		chunks.push(items.slice(offset, offset + BULK_CHUNK_SIZE));
	}

	return chunks;
};

// The position is the (uploadedAt, id) pair; Prisma can't express a tuple comparison, so it expands to an OR
const toCursorFilter = (cursor: MediaObjectCursor) => {
	return {
		OR: [
			{ uploadedAt: { lt: cursor.uploadedAt } },
			{ uploadedAt: cursor.uploadedAt, id: { lt: cursor.id } },
		],
	};
};

export const mediaObjectRepository = {
	/** The projection a sync compares against an R2 listing — id, key and etag only, no content columns. */
	findAllSummaries: async (): Promise<MediaObjectSummary[]> => {
		const prisma = getPrismaClient();

		return await prisma.mediaObject.findMany({
			select: { id: true, objectKey: true, etag: true },
		});
	},

	/** Returns trashed objects too. */
	findById: async (id: string): Promise<MediaObject | undefined> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaObject.findUnique({ where: { id } });

		return row ? toMediaObject(row) : undefined;
	},

	/** One page, newest first, excluding trashed objects. */
	findPage: async (
		input: FindMediaObjectPageInput,
	): Promise<MediaObjectPage> => {
		const prisma = getPrismaClient();
		const rows = await prisma.mediaObject.findMany({
			where: {
				trashedAt: null,
				logicalPath: input.logicalPath,
				contentType: input.contentTypePrefix
					? { startsWith: input.contentTypePrefix }
					: undefined,
				...(input.cursor ? toCursorFilter(input.cursor) : {}),
			},
			orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
			// Read one extra row so the next page can be detected without a separate COUNT
			take: input.limit + 1,
		});

		const objects = rows.slice(0, input.limit).map(toMediaObject);
		const last = objects.at(-1);

		return {
			objects,
			nextCursor:
				rows.length > input.limit && last
					? { uploadedAt: last.uploadedAt, id: last.id }
					: undefined,
		};
	},

	/**
	 * Records where the thumbnail landed, along with any dimensions and duration read alongside it,
	 * and where the object itself came to rest when generation moved it.
	 * Returns the number of rows updated, so a row deleted mid-generation isn't treated as a failure.
	 */
	updateThumbnail: async (input: UpdateThumbnailInput): Promise<number> => {
		const prisma = getPrismaClient();
		const { id, location, ...values } = input;
		const result = await prisma.mediaObject.updateMany({
			where: { id },
			data: {
				...values,
				// Built from the id here rather than taken from the caller, so where a thumbnail
				// lands stays this package's business
				thumbnailKey: buildThumbnailKey(id),
				...(location
					? { ...location, byteSize: BigInt(location.byteSize) }
					: {}),
			},
		});

		return result.count;
	},

	/** Registers newly found media in bulk, ignoring ids that are already registered. */
	insertMany: async (inputs: InsertMediaObjectInput[]): Promise<number> => {
		if (inputs.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		let inserted = 0;

		for (const chunk of toChunks(inputs)) {
			const result = await prisma.mediaObject.createMany({
				data: chunk.map((input) => {
					return { ...input, byteSize: BigInt(input.byteSize) };
				}),
				skipDuplicates: true,
			});

			inserted += result.count;
		}

		return inserted;
	},

	/** Re-points the keys of media moved outside this app. */
	relocateMany: async (inputs: RelocateMediaObjectInput[]): Promise<number> => {
		if (inputs.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		let updated = 0;

		for (const chunk of toChunks(inputs)) {
			const updates = chunk.map((input) => {
				return prisma.mediaObject.update({
					where: { id: input.id },
					data: {
						objectKey: input.objectKey,
						logicalPath: input.logicalPath,
						byteSize: BigInt(input.byteSize),
						etag: input.etag,
						syncedAt: input.syncedAt,
					},
				});
			});

			updated += (await prisma.$transaction(updates)).length;
		}

		return updated;
	},

	/**
	 * Re-registers media replaced under an unchanged key. The thumbnail and dimensions describe the
	 * old content, so they are cleared and the next sync rebuilds them.
	 */
	refreshMany: async (inputs: RefreshMediaObjectInput[]): Promise<number> => {
		if (inputs.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		let refreshed = 0;

		for (const chunk of toChunks(inputs)) {
			const updates = chunk.map((input) => {
				return prisma.mediaObject.update({
					where: { id: input.id },
					data: {
						byteSize: BigInt(input.byteSize),
						etag: input.etag,
						uploadedAt: input.uploadedAt,
						syncedAt: input.syncedAt,
						thumbnailKey: null,
						width: null,
						height: null,
						durationMs: null,
					},
				});
			});

			refreshed += (await prisma.$transaction(updates)).length;
		}

		return refreshed;
	},

	/** Updates the last-seen time of media still present in R2. */
	touchMany: async (ids: string[], syncedAt: Date): Promise<number> => {
		if (ids.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		let touched = 0;

		for (const chunk of toChunks(ids)) {
			const result = await prisma.mediaObject.updateMany({
				where: { id: { in: chunk } },
				data: { syncedAt },
			});

			touched += result.count;
		}

		return touched;
	},

	/** Deletes rows for media gone from R2; their tag links go with them. */
	deleteByIds: async (ids: string[]): Promise<number> => {
		if (ids.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		let deleted = 0;

		for (const chunk of toChunks(ids)) {
			const result = await prisma.mediaObject.deleteMany({
				where: { id: { in: chunk } },
			});

			deleted += result.count;
		}

		return deleted;
	},
};
