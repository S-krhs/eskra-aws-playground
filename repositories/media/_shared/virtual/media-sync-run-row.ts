// In scope: the MediaSyncRun table's column shape as this package sees it
// Out of scope: converting a row to a public type, queries, the public MediaSyncRun type

/** Mirrors the table so a query result can be typed without the generated client leaking out. */
export interface MediaSyncRunRow {
	id: string;
	createdAt: Date;
	startedAt: Date;
	finishedAt: Date | null;
	scannedCount: number;
	insertedCount: number;
	updatedCount: number;
	deletedCount: number;
	error: string | null;
	/** The flag the single-unfinished-row constraint is built on: true while running, NULL once done. */
	running: boolean | null;
}
