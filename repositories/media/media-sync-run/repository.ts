// In scope: inserting a MediaSyncRun row, updating its counts and its finished columns, and reading it back
// Out of scope: running the sync itself, deciding when a run may start, walking R2, invoking Lambda
import { getPrismaClient } from "../../client/prisma.js";
import type { MediaSyncRunRow } from "../_shared/virtual/media-sync-run-row.js";
import type {
	MediaSyncRun,
	UpdateMediaSyncRunCountsInput,
	UpdateMediaSyncRunFinishedInput,
} from "./types.js";

const toMediaSyncRun = (row: MediaSyncRunRow): MediaSyncRun => {
	return {
		id: row.id,
		startedAt: row.startedAt,
		finishedAt: row.finishedAt,
		scannedCount: row.scannedCount,
		insertedCount: row.insertedCount,
		updatedCount: row.updatedCount,
		deletedCount: row.deletedCount,
		error: row.error,
	};
};

// Prisma reports a unique-constraint violation as P2002; matching on the code keeps its error type out of here
const isUniqueViolation = (error: unknown): boolean => {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === "P2002"
	);
};

export const mediaSyncRunRepository = {
	/**
	 * Inserts a row, which takes the one slot an unfinished run may hold.
	 * Returns undefined when another row already holds it — the table allows a single unfinished row,
	 * so two callers racing here settle in the DB rather than by reading first and writing after.
	 */
	insert: async (
		id: string,
		startedAt: Date,
	): Promise<MediaSyncRun | undefined> => {
		const prisma = getPrismaClient();

		try {
			const row = await prisma.mediaSyncRun.create({
				data: { id, startedAt, running: true },
			});

			return toMediaSyncRun(row);
		} catch (error) {
			if (isUniqueViolation(error)) {
				return undefined;
			}

			throw error;
		}
	},

	updateCounts: async (input: UpdateMediaSyncRunCountsInput): Promise<void> => {
		const prisma = getPrismaClient();
		const { id, ...counts } = input;

		await prisma.mediaSyncRun.update({ where: { id }, data: counts });
	},

	/** Passing an `error` records the run as failed. Either way the slot is released. */
	updateFinished: async (
		input: UpdateMediaSyncRunFinishedInput,
	): Promise<void> => {
		const prisma = getPrismaClient();
		const { id, error, ...rest } = input;

		await prisma.mediaSyncRun.update({
			where: { id },
			data: { ...rest, error: error ?? null, running: null },
		});
	},

	/** undefined when the sync has never run. */
	findLatest: async (): Promise<MediaSyncRun | undefined> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaSyncRun.findFirst({
			orderBy: { startedAt: "desc" },
		});

		return row ? toMediaSyncRun(row) : undefined;
	},

	/** The row holding the slot, if there is one. */
	findUnfinished: async (): Promise<MediaSyncRun | undefined> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaSyncRun.findFirst({
			where: { finishedAt: null },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		});

		return row ? toMediaSyncRun(row) : undefined;
	},
};
