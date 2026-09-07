// In scope: 同期の実行記録の開始・進捗更新・終了と、最新および実行中の取得
// Out of scope: 同期そのものの実行、R2 の走査、Lambda の起動
import { getPrismaClient } from "../../db/client.js";
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

/** 同期の実行記録の永続化操作。 */
export const mediaSyncRunRepository = {
	/** 実行を開始した記録を作る。 */
	start: async (id: string, startedAt: Date): Promise<MediaSyncRun> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaSyncRun.create({ data: { id, startedAt } });

		return toMediaSyncRun(row);
	},

	/** 実行中の件数を書き戻す。 */
	updateProgress: async (
		input: UpdateMediaSyncProgressInput,
	): Promise<void> => {
		const prisma = getPrismaClient();
		const { id, ...progress } = input;

		await prisma.mediaSyncRun.update({ where: { id }, data: progress });
	},

	/** 実行の終了を記録する。error を渡すと失敗として残る。 */
	finish: async (input: FinishMediaSyncRunInput): Promise<void> => {
		const prisma = getPrismaClient();
		const { id, error, ...rest } = input;

		await prisma.mediaSyncRun.update({
			where: { id },
			data: { ...rest, error: error ?? null },
		});
	},

	/** 直近の実行を返す。一度も走っていなければ undefined。 */
	findLatest: async (): Promise<MediaSyncRun | undefined> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaSyncRun.findFirst({
			orderBy: { startedAt: "desc" },
		});

		return row ? toMediaSyncRun(row) : undefined;
	},

	/**
	 * 終了していない実行を返す。
	 * 画面からの起動が既に走っている同期を二重に呼ばないための判定に使う。
	 */
	findRunning: async (): Promise<MediaSyncRun | undefined> => {
		const prisma = getPrismaClient();
		const row = await prisma.mediaSyncRun.findFirst({
			where: { finishedAt: null },
			orderBy: { startedAt: "desc" },
		});

		return row ? toMediaSyncRun(row) : undefined;
	},
};
