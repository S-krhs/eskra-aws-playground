// In scope: the folders held on their own, apart from the media filed into them
// Out of scope: MediaObject rows, storage keys, validating what a path may look like
import { getPrismaClient } from "../../client/prisma.js";

export const mediaFolderRepository = {
	/** Every folder registered on its own, by path. One still holding media is in here too. */
	findAll: async (): Promise<string[]> => {
		const prisma = getPrismaClient();
		const rows = await prisma.mediaFolder.findMany({
			select: { path: true },
			orderBy: { path: "asc" },
		});

		return rows.map((row) => {
			return row.path;
		});
	},

	/**
	 * Registers one folder, so it keeps being offered once the media filed into it has moved on.
	 * A path already registered isn't an error.
	 */
	insert: async (path: string): Promise<void> => {
		const prisma = getPrismaClient();

		await prisma.mediaFolder.createMany({
			data: [{ path }],
			skipDuplicates: true,
		});
	},

	/** Removes one folder's own row. Media filed under that path is left where it is. */
	delete: async (path: string): Promise<number> => {
		const prisma = getPrismaClient();
		const result = await prisma.mediaFolder.deleteMany({ where: { path } });

		return result.count;
	},
};
