// In scope: schedule 起動する batch job の実行タイミング設定を一元管理する
// Out of scope: Lambda function 本体やイベントルーティングの定義

import { batchNames as animeBatchNames } from "../../apps/batch-anime-analysis/src/shared/routes/batch-names.js";

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
	/** UMA ワンドロお題の scheduler job を毎日 JST 00:00 に起動する。job が当日 12:00-18:00 のランダム時刻へお題通知の one-time schedule を登録する。 */
	umaOneDrawTopicScheduler: {
		schedule: "cron(0 0 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: "uma-one-draw-topic-scheduler" },
	},
	/** 遊技チェックリマインダーを毎日 JST 22:00 に起動する。 */
	playCheckReminder: {
		schedule: "cron(0 22 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: "play-check-reminder" },
	},
	/** アニメ分析 orchestrator を毎日 JST 09:00 に起動する。 */
	animeScrapingOrchestrator9: {
		schedule: "cron(0 9 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: animeBatchNames.animeScrapingOrchestrator, scheduleHour: 9 },
	},
	/** アニメ分析 orchestrator を毎日 JST 23:00 に起動する。 */
	animeScrapingOrchestrator23: {
		schedule: "cron(0 23 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: animeBatchNames.animeScrapingOrchestrator, scheduleHour: 23 },
	},
} as const satisfies Record<string, JobSchedule>;
