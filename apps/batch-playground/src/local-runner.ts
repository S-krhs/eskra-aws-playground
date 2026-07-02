// やること: .env のローカル設定から Lambda ハンドラーを呼び出す
// やらないこと: 本番 Lambda 固有の制御やジョブ内部の処理を持つ
import { config } from "dotenv";
import { handler } from "./lambda-handler.js";

config();

const job = process.env.BATCH_JOB ?? "uma-one-draw-topic";
const webhookUrl =
	process.env[
		`${job.replaceAll("-", "_").toUpperCase()}_DISCORD_WEBHOOK_URL`
	] || process.env.DEFAULT_DISCORD_WEBHOOK_URL;

const event = {
	job,
	webhookUrl,
};

handler(event)
	.then((result) => {
		console.log("Local run result:", result);
	})
	.catch((error) => {
		console.error("Local run failed:", error);
		process.exit(1);
	});
