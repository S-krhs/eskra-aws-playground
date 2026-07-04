// In scope: SQS event を受け取り、dataSource スクレイピング job へ委譲する
// Out of scope: SQS message body の解釈、スクレイピング処理、通知処理を持つ
import { dataSourceJob } from "../jobs/data-source.js";
import type {
	SqsBatchEvent,
	SqsBatchResponse,
} from "../shared/infra/lambda.js";

/** アニメ分析 dataSource スクレイピング Lambda のエントリポイント。 */
export const handler = async (
	event: SqsBatchEvent,
): Promise<SqsBatchResponse> => dataSourceJob(event);
