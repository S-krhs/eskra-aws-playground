// In scope: Lambda イベントからジョブ名を推定し、登録済みジョブのハンドラーへ解決する
// Out of scope: 個別ジョブの処理内容や外部連携の詳細を持つ
import { umaOneDrawTopicJob } from "../jobs/uma-one-draw-topic.js";
import {
	type BatchName,
	batchNameList,
	batchNames,
} from "../shared/routes/batch-names.js";
import { batchEventSchema } from "../shared/schemas/lambda/batch/event.js";
import type { BatchResponse } from "../shared/schemas/lambda/batch/response.js";

/** ジョブ名に対応して実行されるバッチジョブ関数。 */
export type BatchJob = (event: unknown) => Promise<BatchResponse>;

const isBatchName = (value: string): value is BatchName => {
	return batchNameList.includes(value as BatchName);
};

/** Lambda イベントから実行対象のジョブ名を取得する。 */
export const getJobName = (event: unknown): BatchName => {
	const parsedEvent = batchEventSchema.safeParse(event);

	if (!parsedEvent.success) {
		throw new Error("job が設定されていません");
	}

	const jobName = parsedEvent.data.job;

	if (isBatchName(jobName)) {
		return jobName;
	}

	throw new Error("未対応の batch job です");
};

/** ジョブ名に対応するバッチハンドラーを返す。 */
export const resolveBatchJob = (jobName: BatchName): BatchJob => {
	switch (jobName) {
		case batchNames.umaOneDrawTopic:
			return umaOneDrawTopicJob;
	}
};
