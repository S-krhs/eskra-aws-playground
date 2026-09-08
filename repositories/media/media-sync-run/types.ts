// In scope: the input/output types of the MediaSyncRun repository
// Out of scope: validation schemas, DB access, running the sync itself

/** One sync run; an undefined finishedAt means it is still running. */
export interface MediaSyncRun {
	id: string;
	startedAt: Date;
	finishedAt: Date | undefined;
	scannedCount: number;
	insertedCount: number;
	updatedCount: number;
	deletedCount: number;
	error: string | undefined;
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
