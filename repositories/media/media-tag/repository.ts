// In scope: reading the tags on the media a filter keeps, and replacing the ones one media object carries
// Out of scope: MediaObject rows, storage, deciding which tags a caller means, normalising a name
import { getPrismaClient } from "../../client/prisma.js";
import { toMediaObjectWhere } from "../_shared/query/media-object-filter.js";
import type { MediaObjectFilter } from "../media-object/types.js";
import type { MediaTag, MediaTagUsage } from "./types.js";

export const mediaTagRepository = {
	/**
	 * The tags carried by at least one of the media objects the filter keeps, with how many of those carry
	 * each — the one carried by the most first and ties by name. An empty filter counts every object.
	 */
	findUsages: async (filter: MediaObjectFilter): Promise<MediaTagUsage[]> => {
		const prisma = getPrismaClient();
		const counted = { mediaObject: toMediaObjectWhere(filter) };
		const tags = await prisma.mediaTag.findMany({
			where: { mediaObjects: { some: counted } },
			select: {
				id: true,
				name: true,
				_count: { select: { mediaObjects: { where: counted } } },
			},
			orderBy: { name: "asc" },
		});

		// Prisma can order by a relation's whole count but not by a filtered one, so the count order is
		// applied here; the sort is stable, which keeps the name order within a tie
		return tags
			.map((tag) => {
				return {
					id: tag.id,
					name: tag.name,
					mediaCount: tag._count.mediaObjects,
				};
			})
			.sort((a, b) => {
				return b.mediaCount - a.mediaCount;
			});
	},

	/**
	 * Makes the tags on one media object exactly these names: the ones not seen before are created,
	 * the ones no longer named are unlinked, and a tag left on nothing at all is deleted so it stops
	 * being offered. Passing an empty list clears them.
	 * Returns what the object carries afterwards.
	 */
	replaceObjectTags: async (
		mediaObjectId: string,
		names: string[],
	): Promise<MediaTag[]> => {
		const prisma = getPrismaClient();

		return await prisma.$transaction(async (tx) => {
			// Created before they are read rather than looked up first: two callers naming the same new
			// tag at once settle on the unique constraint instead of racing
			await tx.mediaTag.createMany({
				data: names.map((name) => {
					return { name };
				}),
				skipDuplicates: true,
			});

			const tags = await tx.mediaTag.findMany({
				where: { name: { in: names } },
				select: { id: true, name: true },
				orderBy: { name: "asc" },
			});
			const tagIds = tags.map((tag) => {
				return tag.id;
			});

			// An empty notIn matches every row, which is what clearing the tags has to do
			await tx.mediaObjectTag.deleteMany({
				where: { mediaObjectId, tagId: { notIn: tagIds } },
			});
			await tx.mediaObjectTag.createMany({
				data: tagIds.map((tagId) => {
					return { mediaObjectId, tagId };
				}),
				skipDuplicates: true,
			});
			await tx.mediaTag.deleteMany({ where: { mediaObjects: { none: {} } } });

			return tags;
		});
	},
};
