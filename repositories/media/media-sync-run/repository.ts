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

export const mediaSyncRunRepository = {
	start: async (id: string, startedAt: Date): Promise<MediaSyncRun> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaSyncRun.create({ data: { id, startedAt } });

		return toMediaSyncRun(row);
	},

	updateProgress: async (
		input: UpdateMediaSyncProgressInput,
	): Promise<void> => {
		const prisma = getPrismaClient();
		const { id, ...progress } = input;

		await prisma.mediaSyncRun.update({ where: { id }, data: progress });
	},

	/** Passing an `error` records the run as failed. */
	finish: async (input: FinishMediaSyncRunInput): Promise<void> => {
		const prisma = getPrismaClient();
		const { id, error, ...rest } = input;

		await prisma.mediaSyncRun.update({
			where: { id },
			data: { ...rest, error: error ?? null },
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

	/**
	 * Returns the oldest unfinished run. startedAt is taken before the row is inserted, so two runs
	 * starting at once could each see themselves as oldest. Ordering by the DB-assigned createdAt and
	 * breaking ties on id makes both of them pick the same row.
	 */
	findRunning: async (): Promise<MediaSyncRun | undefined> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaSyncRun.findFirst({
			where: { finishedAt: null },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		});

		return row ? toMediaSyncRun(row) : undefined;
	},
};
