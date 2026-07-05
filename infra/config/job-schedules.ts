// In scope: schedule 起動する batch job の実行タイミング設定を一元管理する
// Out of scope: Lambda function 本体やイベントルーティングの定義

import { batchNames as animeBatchNames } from "../../apps/batch-anime-analysis/src/shared/routes/batch-names.js";
import { batchNames as playgroundBatchNames } from "../../apps/batch-playground/src/shared/routes/batch-names.js";

/** schedule 起動する batch job 1 件分のスケジュール設定。CronV2 へ spread して使う。 */
export type JobSchedule = {
	/** EventBridge Scheduler の cron 式。 */
	readonly schedule: `cron(${string})`;
	/** cron 式を解釈する IANA タイムゾーン。 */
	readonly timezone: string;
	/** 起動失敗時のリトライ回数。 */
	readonly retries: number;
	/** Lambda に渡すイベント。batch-router がこの job 名でジョブを解決する。 */
	readonly event: {
		readonly job: string;
		/** 起動スケジュールごとに対象を切り替える job（アニメ orchestrator）へ渡す時刻。 */
		readonly scheduleHour?: number;
	};
};

/** schedule 起動する batch job のスケジュール設定を job 単位で一元管理する。 */
export const jobSchedules = {
	/** UMA ワンドロお題通知を毎日 JST 12:00 に起動する。 */
	umaOneDrawTopic: {
		schedule: "cron(0 12 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: playgroundBatchNames.umaOneDrawTopic },
	},
	/** アニメ分析 orchestrator を毎日 JST 09:00 に起動する。 */
	animeScrapingOrchestrator9: {
		schedule: "cron(0 9 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: animeBatchNames.animeScrapingOrchestrator, scheduleHour: 9 },
	},
	/** アニメ分析 orchestrator を毎日 JST 22:00 に起動する。 */
	animeScrapingOrchestrator22: {
		schedule: "cron(0 22 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: animeBatchNames.animeScrapingOrchestrator, scheduleHour: 22 },
	},
} as const satisfies Record<string, JobSchedule>;
