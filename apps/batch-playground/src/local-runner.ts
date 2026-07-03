// やること: .env のローカル設定から Lambda ハンドラーを呼び出す
// やらないこと: 本番 Lambda 固有の制御やジョブ内部の処理を持つ
import { config } from "dotenv";
import { handler } from "./lambda-handler.js";
import { batchRoutes } from "./shared/routes/batch-routes.js";

config();

const job = process.env.BATCH_JOB ?? batchRoutes.umaOneDrawTopic;

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
