// やること: .env のローカル設定から Lambda ハンドラーを呼び出す
// やらないこと: 本番 Lambda 固有の制御やジョブ内部の処理を持つ
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

import { handler } from "./lambda-handler.js";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
config({
	path: envPath,
});

const job = process.env.BATCH_JOB;

const event = {
	job,
};

handler(event)
	.then((result) => {
		console.log("Local run result:", result);
	})
	.catch((error) => {
		console.error("Local run failed:", error);
		process.exit(1);
	});
