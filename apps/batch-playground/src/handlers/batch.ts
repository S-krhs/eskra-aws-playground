// In scope: Lambda イベントを受け取り、ジョブルーティング層へ実行を委譲する
// Out of scope: 個別ジョブの選択条件、業務ロジック、外部連携の詳細を持つ
import { getJobName, resolveBatchJob } from "../routing/batch-router.js";
import type { BatchResponse } from "../shared/schemas/lambda/batch/response.js";

/** Lambda の共通エントリポイント。イベントに対応するバッチジョブを実行する。 */
export const handler = async (event: unknown = {}): Promise<BatchResponse> => {
	const jobName = getJobName(event);
	const batchJob = resolveBatchJob(jobName);

	return batchJob(event);
};
