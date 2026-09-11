// In scope: registering, re-keying and deleting MediaObject rows, and reading them one at a time or by page
// Out of scope: reading/writing R2, key construction, tag and folder operations, thumbnail generation
import { getPrismaClient } from "../../client/prisma.js";
import { buildThumbnailKey } from "../_shared/formatter/object-key.js";
import type { MediaObjectWithTagsRow } from "../_shared/virtual/media-object-row.js";
import type {
	FindMediaObjectPageInput,
	InsertMediaObjectInput,
	MediaObject,
	MediaObjectCursor,
	MediaObjectIdentity,
	MediaObjectPage,
	MediaObjectSummary,
	RefreshMediaObjectInput,
	RelocateMediaObjectInput,
	UpdateThumbnailInput,
	UpdateTrashedLocationInput,
} from "./types.js";

// Read alongside every whole row, so a caller never has to ask for the tags separately
const TAG_NAMES_SELECTION = {
	select: { tag: { select: { name: true } } },
	orderBy: { tag: { name: "asc" } },
} as const;

const toMediaObject = (row: MediaObjectWithTagsRow): MediaObject => {
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
		tags: row.tags.map((link) => {
			return link.tag.name;
		}),
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

const sumCounts = (results: { count: number }[]): number => {
	return results.reduce((total, result) => {
		return total + result.count;
	}, 0);
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

	/**
	 * The objects with no thumbnail recorded, trashed rows excluded.
	 * Every one of them comes back at once: a caller that can't get through them all leaves the rest
	 * to its next run rather than paging.
	 */
	findAllWithoutThumbnail: async (): Promise<MediaObjectIdentity[]> => {
		const prisma = getPrismaClient();

		return await prisma.mediaObject.findMany({
			where: { thumbnailKey: null, trashedAt: null },
			select: { id: true, objectKey: true },
		});
	},

	/**
	 * The folders media is actually filed into, by path.
	 * Trashed rows are left out, and so is the empty path an unfiled object carries.
	 */
	findAllLogicalPaths: async (): Promise<string[]> => {
		const prisma = getPrismaClient();
		const rows = await prisma.mediaObject.findMany({
			where: { trashedAt: null, logicalPath: { not: "" } },
			distinct: ["logicalPath"],
			select: { logicalPath: true },
			orderBy: { logicalPath: "asc" },
		});

		return rows.map((row) => {
			return row.logicalPath;
		});
	},

	/** Returns trashed objects too. */
	findById: async (id: string): Promise<MediaObject | undefined> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaObject.findUnique({
			where: { id },
			include: { tags: TAG_NAMES_SELECTION },
		});

		return row ? toMediaObject(row) : undefined;
	},

	/** The same row `findById` reads, under the exclusion `findPage` applies. */
	findUntrashedById: async (id: string): Promise<MediaObject | undefined> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaObject.findFirst({
			where: { id, trashedAt: null },
			include: { tags: TAG_NAMES_SELECTION },
		});

		return row ? toMediaObject(row) : undefined;
	},

	/** One page, newest first, of one side of the trash. */
	findPage: async (
		input: FindMediaObjectPageInput,
	): Promise<MediaObjectPage> => {
		const prisma = getPrismaClient();
		const rows = await prisma.mediaObject.findMany({
			where: {
				trashedAt: input.trashed ? { not: null } : null,
				logicalPath: input.logicalPath,
				contentType: input.contentTypePrefix
					? { startsWith: input.contentTypePrefix }
					: undefined,
				tags: input.tagName
					? { some: { tag: { name: input.tagName } } }
					: undefined,
				...(input.cursor ? toCursorFilter(input.cursor) : {}),
			},
			include: { tags: TAG_NAMES_SELECTION },
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

	/**
	 * Puts one object in the trash, or takes it back out when `trashedAt` is null, recording the key
	 * its stored object now sits under.
	 * Returns the number of rows updated, so a row that isn't there reads as 0 rather than throwing.
	 */
	updateTrashedLocation: async (
		input: UpdateTrashedLocationInput,
	): Promise<number> => {
		const prisma = getPrismaClient();
		const { id, byteSize, ...values } = input;
		const result = await prisma.mediaObject.updateMany({
			where: { id },
			data: { ...values, byteSize: BigInt(byteSize) },
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

	/**
	 * Re-points the keys of media moved outside this app.
	 * Returns the number of rows updated, so a row deleted since the listing was taken drops out of
	 * the count instead of failing the rest of its chunk.
	 */
	relocateMany: async (inputs: RelocateMediaObjectInput[]): Promise<number> => {
		if (inputs.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		let updated = 0;

		for (const chunk of toChunks(inputs)) {
			const updates = chunk.map((input) => {
				return prisma.mediaObject.updateMany({
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

			updated += sumCounts(await prisma.$transaction(updates));
		}

		return updated;
	},

	/**
	 * Re-registers media replaced under an unchanged key. The thumbnail and dimensions describe the
	 * old content, so they are cleared and the next sync rebuilds them.
	 * Returns the number of rows updated, on the same terms as `relocateMany`.
	 */
	refreshMany: async (inputs: RefreshMediaObjectInput[]): Promise<number> => {
		if (inputs.length === 0) {
			return 0;
		}

		const prisma = getPrismaClient();
		let refreshed = 0;

		for (const chunk of toChunks(inputs)) {
			const updates = chunk.map((input) => {
				return prisma.mediaObject.updateMany({
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

			refreshed += sumCounts(await prisma.$transaction(updates));
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
