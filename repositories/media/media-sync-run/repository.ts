// In scope: starting, updating and finishing a sync run record, plus reading the latest and the running one
// Out of scope: running the sync itself, walking R2, invoking Lambda
import { getPrismaClient } from "../../client/prisma.js";
import type {
	FinishMediaSyncRunInput,
	MediaSyncRun,
	UpdateMediaSyncProgressInput,
} from "./types.js";

interface MediaSyncRunRow {
	id: string;
	startedAt: Date;
	finishedAt: Date | null;
	scannedCount: number;
	insertedCount: number;
	updatedCount: number;
	deletedCount: number;
	error: string | null;
}

const toMediaSyncRun = (row: MediaSyncRunRow): MediaSyncRun => {
	return {
		id: row.id,
		startedAt: row.startedAt,
		finishedAt: row.finishedAt ?? undefined,
		scannedCount: row.scannedCount,
		insertedCount: row.insertedCount,
		updatedCount: row.updatedCount,
		deletedCount: row.deletedCount,
		error: row.error ?? undefined,
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
	 * Opens a run, taking the one slot an unfinished run may hold.
	 * Returns undefined when another run already holds it — the table allows a single unfinished row,
	 * so two invocations racing here settle in the DB rather than by reading first and writing after.
	 */
	start: async (
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

	updateProgress: async (
		input: UpdateMediaSyncProgressInput,
	): Promise<void> => {
		const prisma = getPrismaClient();
		const { id, ...progress } = input;

		await prisma.mediaSyncRun.update({ where: { id }, data: progress });
	},

	/** Passing an `error` records the run as failed. Either way the slot is released. */
	finish: async (input: FinishMediaSyncRunInput): Promise<void> => {
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

	/** The unfinished run holding the slot, if there is one. */
	findRunning: async (): Promise<MediaSyncRun | undefined> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaSyncRun.findFirst({
			where: { finishedAt: null },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		});

		return row ? toMediaSyncRun(row) : undefined;
	},
};
