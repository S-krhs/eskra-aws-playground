// In scope: the one place holding when each schedule-triggered batch job runs
// Out of scope: the Lambda function itself and event routing

import { batchNames as animeBatchNames } from "../../apps/batch-anime-analysis/src/_shared/routes/batch-names.js";
import { batchJobNames as playgroundBatchJobNames } from "../../apps/batch-playground/src/handlers/batch/contracts/job-names.js";

/** One schedule-triggered batch job's timing, spread into a CronV2. */
export type JobSchedule = {
	/** EventBridge Scheduler cron expression. */
	readonly schedule: `cron(${string})`;
	/** IANA timezone the cron expression is read in. */
	readonly timezone: string;
	/** How many times a failed trigger is retried. */
	readonly retries: number;
	/** The event handed to Lambda; batch-router resolves the job from this name. */
	readonly event: {
		readonly job: string;
		/** The hour handed to a job whose targets differ per schedule (the anime orchestrator). */
		readonly scheduleHour?: number;
	};
};

export const jobSchedules = {
	/** The job registers a one-time schedule for the topic notification at a random time between 12:00 and 18:00 that day. */
	umaOneDrawTopicScheduler: {
		schedule: "cron(0 0 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: playgroundBatchJobNames.umaOneDrawTopicScheduler },
	},
	playCheckReminder: {
		schedule: "cron(0 22 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: playgroundBatchJobNames.playCheckReminder },
	},
	/** Resolved through the same router as the other batch jobs. */
	mediaSync: {
		schedule: "cron(0 0/2 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: playgroundBatchJobNames.mediaSync },
	},
	animeScrapingOrchestrator9: {
		schedule: "cron(0 9 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: animeBatchNames.animeScrapingOrchestrator, scheduleHour: 9 },
	},
	/** Targets the previous day's scraped date. */
	animeMetricBigQueryExport: {
		schedule: "cron(0 1 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: animeBatchNames.animeMetricBigQueryExport },
	},
	animeScrapingOrchestrator23: {
		schedule: "cron(0 23 * * ? *)",
		timezone: "Asia/Tokyo",
		retries: 0,
		event: { job: animeBatchNames.animeScrapingOrchestrator, scheduleHour: 23 },
	},
} as const satisfies Record<string, JobSchedule>;
