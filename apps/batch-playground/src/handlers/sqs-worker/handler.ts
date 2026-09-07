// In scope: SQS event を検証し、message ごとに担当ジョブへ委譲する
// Out of scope: 個別ジョブの処理内容、Discord API 通信、deferred ack の生成を持つ
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

/** message を対応するジョブへ委譲する。 */
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
 * SQS 起動のジョブを担う worker のエントリポイント。
 * queue ごとに別の Lambda として動き、message の job 名で担当ジョブを解決する。
 * message 単位で失敗を分離し、失敗した record だけを SQS の再試行対象にする。
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
