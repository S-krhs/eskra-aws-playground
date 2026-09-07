// In scope: validating the SQS event and delegating each message to its owning job
// Out of scope: what each job does, Discord API calls, building a deferred ack
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { interactionJobNames } from "@eskra-aws-playground/shared-domains/contracts/interaction-job-names.js";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/contracts/media-job-names.js";
import { gambleCheckDisableJob } from "./jobs/gamble-check-disable-job.js";
import { gambleCheckEnableJob } from "./jobs/gamble-check-enable-job.js";
import { kaguyaInuihiroshiReplyJob } from "./jobs/kaguya-inuihiroshi-reply-job.js";
import { mediaThumbnailJob } from "./jobs/media-thumbnail-job.js";
import { playCheckReminderChoiceJob } from "./jobs/play-check-reminder-choice-job.js";
import { yacchoHelloReplyJob } from "./jobs/yaccho-hello-reply-job.js";
import {
	type SqsJobMessage,
	type SqsWorkerResponse,
	sqsJobMessageSchema,
	sqsWorkerEventSchema,
} from "./schema.js";

const logger = createBatchLogger("sqs-job-worker");

/** Delegates a message to the job that matches it. */
const runJob = (message: SqsJobMessage): Promise<void> => {
	switch (message.job) {
		case interactionJobNames.yacchoHelloReply:
			return yacchoHelloReplyJob(message);
		case interactionJobNames.kaguyaInuihiroshiReply:
			return kaguyaInuihiroshiReplyJob(message);
		case interactionJobNames.gambleCheckEnable:
			return gambleCheckEnableJob(message);
		case interactionJobNames.gambleCheckDisable:
			return gambleCheckDisableJob(message);
		case interactionJobNames.playCheckReminderChoice:
			return playCheckReminderChoiceJob(message);
		case mediaJobNames.mediaThumbnail:
			return mediaThumbnailJob(message);
	}
};

/**
 * The entry point for SQS-triggered jobs. It runs as a separate Lambda per queue and resolves the
 * owning job from the message's job name. Failure is isolated per message, and only the failed
 * records go back to SQS for retry.
 */
export const handler = async (event: unknown): Promise<SqsWorkerResponse> => {
	const { Records } = sqsWorkerEventSchema.parse(event);

	const batchItemFailures: SqsWorkerResponse["batchItemFailures"] = [];

	for (const record of Records) {
		const { messageId } = record;
		try {
			const message = sqsJobMessageSchema.parse(JSON.parse(record.body));
			logger.start({ messageId, job: message.job });

			await runJob(message);

			logger.complete({ messageId, job: message.job });
		} catch (error) {
			logger.failure(error, { messageId });
			batchItemFailures.push({ itemIdentifier: messageId });
		}
	}

	return { batchItemFailures };
};
