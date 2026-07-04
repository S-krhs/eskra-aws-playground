// In scope: Orchestrator Lambda イベントを受け取り、SQS 投入 job を実行する
// Out of scope: 個別スクレイピング処理、dataSource 単位実行制御、外部通知詳細を持つ
import { orchestratorJob } from "../jobs/orchestrator.js";
import type { BatchResponse, LambdaEvent } from "../shared/infra/lambda.js";

/** アニメ分析 orchestrator Lambda のエントリポイント。 */
export const handler = async (
	event: LambdaEvent = {},
): Promise<BatchResponse> => {
	return orchestratorJob(event);
};
