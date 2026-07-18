// In scope: Lambda イベントを検証し、対応する登録済みバッチジョブへ実行を委譲する
// Out of scope: 個別ジョブの処理内容、業務ロジック、外部連携の詳細を持つ

import { batchJobNames } from "./contracts/job-names.js";
import { playCheckReminderJob } from "./jobs/play-check-reminder.js";
import { umaOneDrawTopicJob } from "./jobs/uma-one-draw-topic.js";
import { umaOneDrawTopicSchedulerJob } from "./jobs/uma-one-draw-topic-scheduler.js";
import { type BatchResponse, batchEventSchema } from "./schema.js";

/** ジョブ名に対応して実行されるバッチジョブ関数。context には Lambda context を渡す。 */
type BatchJob = (event: unknown, context?: unknown) => Promise<BatchResponse>;

/** job 名と実行するジョブの対応。ジョブを追加したらここへ登録する。 */
const batchJobs = new Map<string, BatchJob>([
	[batchJobNames.umaOneDrawTopic, umaOneDrawTopicJob],
	[batchJobNames.umaOneDrawTopicScheduler, umaOneDrawTopicSchedulerJob],
	[batchJobNames.playCheckReminder, playCheckReminderJob],
]);

/** Lambda の共通エントリポイント。イベントに対応するバッチジョブを実行する。 */
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
