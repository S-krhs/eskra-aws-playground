// やること: Lambda イベントを受け取り、ジョブルーティング層へ実行を委譲する
// やらないこと: 個別ジョブの選択条件、業務ロジック、外部連携の詳細を持つ
import { getJobName, resolveBatchJob } from "./routing/batch-router.js";
import type { BatchResponse, LambdaEvent } from "./shared/infra/lambda.js";

/** Lambda の共通エントリポイント。イベントに対応するバッチジョブを実行する。 */
export const handler = async (
	event: LambdaEvent = {},
): Promise<BatchResponse> => {
	const jobName = getJobName(event);
	const batchJob = resolveBatchJob(jobName);

	console.log("Starting batch job", {
		jobName,
	});

	const result = await batchJob(event);

	console.log("Batch job finished", result);

	return result;
};
