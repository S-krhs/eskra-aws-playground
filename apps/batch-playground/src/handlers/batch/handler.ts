// In scope: validating the Lambda event and delegating to the registered batch job that matches
// Out of scope: what each job does, business logic, external-integration detail

import { batchJobNames } from "./contracts/job-names.js";
import { mediaSyncJob } from "./jobs/media-sync.js";
import { playCheckReminderJob } from "./jobs/play-check-reminder.js";
import { umaOneDrawTopicJob } from "./jobs/uma-one-draw-topic.js";
import { umaOneDrawTopicSchedulerJob } from "./jobs/uma-one-draw-topic-scheduler.js";
import { type BatchResponse, batchEventSchema } from "./schema.js";

/** The batch job run for a job name; `context` is the Lambda context. */
type BatchJob = (event: unknown, context?: unknown) => Promise<BatchResponse>;

/** Job name to the job that runs it; a new job gets registered here. */
const batchJobs = new Map<string, BatchJob>([
	[batchJobNames.umaOneDrawTopic, umaOneDrawTopicJob],
	[batchJobNames.umaOneDrawTopicScheduler, umaOneDrawTopicSchedulerJob],
	[batchJobNames.playCheckReminder, playCheckReminderJob],
	[batchJobNames.mediaSync, mediaSyncJob],
]);

/** The shared Lambda entry point; runs the batch job matching the event. */
export const handler = async (
	event: unknown = {},
	context?: unknown,
): Promise<BatchResponse> => {
	const parsedEvent = batchEventSchema.safeParse(event);

	if (!parsedEvent.success) {
		throw new Error("有効な job が指定されていません");
	}

	const batchJob = batchJobs.get(parsedEvent.data.job);

	if (!batchJob) {
		throw new Error("未対応の batch job です");
	}

	return batchJob(event, context);
};
