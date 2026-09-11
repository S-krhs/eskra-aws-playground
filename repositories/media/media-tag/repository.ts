// In scope: reading the tags in use, and replacing the ones one media object carries
// Out of scope: MediaObject rows, storage, deciding which tags a caller means, normalising a name
import { getPrismaClient } from "../../client/prisma.js";
import type { MediaTag } from "./types.js";

export const mediaTagRepository = {
	/** Every tag in use, by name. */
	findAll: async (): Promise<MediaTag[]> => {
		const prisma = getPrismaClient();

		return await prisma.mediaTag.findMany({
			select: { id: true, name: true },
			orderBy: { name: "asc" },
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
