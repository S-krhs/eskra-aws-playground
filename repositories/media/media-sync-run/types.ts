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

/** The counts written back while a run is in flight. */
export interface MediaSyncProgress {
	scannedCount: number;
	insertedCount: number;
	updatedCount: number;
	deletedCount: number;
}

export interface UpdateMediaSyncProgressInput extends MediaSyncProgress {
	id: string;
}

/** Records the end of a run; an `error` marks it as failed. */
export interface FinishMediaSyncRunInput extends UpdateMediaSyncProgressInput {
	finishedAt: Date;
	error?: string;
}
