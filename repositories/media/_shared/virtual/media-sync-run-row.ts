// In scope: the MediaSyncRun table's column shape as this package sees it
// Out of scope: converting a row to a public type, queries, the public MediaSyncRun type

/** `running` is the nullable flag the single-unfinished-row constraint is built on, and never read back. */
export interface MediaSyncRunRow {
	id: string;
	startedAt: Date;
	finishedAt: Date | null;
	scannedCount: number;
	insertedCount: number;
	updatedCount: number;
	deletedCount: number;
	error: string | null;
}
