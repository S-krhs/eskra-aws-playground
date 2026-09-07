// In scope: MediaSyncRun repository の入出力型
// Out of scope: validation schema、DB 操作、同期そのものの実行

/** 同期の 1 回の実行。finishedAt が undefined なら実行中。 */
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

/** 実行中に書き戻す件数。 */
export interface MediaSyncProgress {
	scannedCount: number;
	insertedCount: number;
	updatedCount: number;
	deletedCount: number;
}

/** 進捗の更新入力。 */
export interface UpdateMediaSyncProgressInput extends MediaSyncProgress {
	id: string;
}

/** 終了の記録入力。error があれば失敗として残す。 */
export interface FinishMediaSyncRunInput extends UpdateMediaSyncProgressInput {
	finishedAt: Date;
	error?: string;
}
