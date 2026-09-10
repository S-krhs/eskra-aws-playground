// In scope: the input/output types of the MediaSyncRun repository
// Out of scope: validation schemas, DB access, running the sync itself

/** One sync run; a null finishedAt means it is still running. Nullable columns come back as null, so a caller shaping them for the wire has nothing to convert. */
export interface MediaSyncRun {
	id: string;
	startedAt: Date;
	finishedAt: Date | null;
	scannedCount: number;
	insertedCount: number;
	updatedCount: number;
	deletedCount: number;
	error: string | null;
}

/** The four count columns a run accumulates. */
export interface MediaSyncRunCounts {
	scannedCount: number;
	insertedCount: number;
	updatedCount: number;
	deletedCount: number;
}

export interface UpdateMediaSyncRunCountsInput extends MediaSyncRunCounts {
	id: string;
}

/** Writes the columns that close a row out; an `error` marks the run as failed. */
export interface UpdateMediaSyncRunFinishedInput
	extends UpdateMediaSyncRunCountsInput {
	finishedAt: Date;
	error?: string;
}
