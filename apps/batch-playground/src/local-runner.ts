// In scope: .env のローカル設定から Lambda ハンドラーを呼び出す
// Out of scope: 本番 Lambda 固有の制御やジョブ内部の処理を持つ
import { fileURLToPath } from "node:url";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { config } from "dotenv";

import { handler } from "./handlers/batch.js";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
config({
	path: envPath,
});

const logger = createBatchLogger("local-runner");

const job = process.env.BATCH_JOB;

const event = {
	job,
};

handler(event)
	.then((result) => {
		logger.complete({ result });
	})
	.catch((error) => {
		logger.failure(error);
		process.exit(1);
	});
