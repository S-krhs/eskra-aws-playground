// In scope: .env のローカル設定から合成 SQS event を作り sqs-worker ハンドラーを呼び出す
// Out of scope: 本番 Lambda 固有の制御やジョブ内部の処理を持つ
import { fileURLToPath } from "node:url";
import { createBatchLogger } from "@lambda-batch-playground/libs/logger/batch-logger.js";
import { dataSourceRepository } from "@lambda-batch-playground/repositories/anime/data-source.repository.js";
import { config } from "dotenv";
import { handler } from "./handlers/sqs-worker.js";
import type { SqsBatchEvent } from "./shared/infra/lambda.js";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
config({
	path: envPath,
});

const logger = createBatchLogger("local-runner");

// .env の BATCH_DATA_SOURCE_IDS（カンマ区切り）で対象を絞る。未指定なら repository 全件。
const configuredIds = (process.env.BATCH_DATA_SOURCE_IDS || "")
	.split(",")
	.map((id) => {
		return id.trim();
	})
	.filter((id) => {
		return id.length > 0;
	});
const dataSourceIds =
	configuredIds.length > 0
		? configuredIds
		: dataSourceRepository.findMany().map((dataSource) => {
				return dataSource.id;
			});

// orchestrator を介さず、worker が受け取る形の SQS event を組み立てる。
const event: SqsBatchEvent = {
	Records: dataSourceIds.map((dataSourceId, index) => {
		return {
			messageId: `local-message-${index}`,
			body: JSON.stringify({ dataSourceId }),
		};
	}),
};

handler(event)
	.then((result) => {
		logger.complete({ result });
		// worker は partial batch response を返すため、失敗 record があれば非 0 終了。
		if (result.batchItemFailures.length > 0) {
			process.exit(1);
		}
	})
	.catch((error) => {
		logger.failure(error);
		process.exit(1);
	});
