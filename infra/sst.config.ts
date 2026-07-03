/// <reference path="../.sst/platform/config.d.ts" />

// SST app と AWS リソース名の接頭辞として使うアプリ名
const appName = "lambda-batch-playground";

export default $config({
	// デプロイ stage に応じた SST app の基本設定
	app(input) {
		return {
			name: appName,
			home: "aws",
			removal: input?.stage === "production" ? "retain" : "remove",
			protect: input?.stage === "production",
		};
	},
	async run() {
		const { batchRoutes } = await import(
			"../apps/batch-playground/src/shared/routes/batch-routes.js"
		);

		// UMA ワンドロお題通知用の Discord Webhook URL を Secret として扱う
		const umaOneDrawTopicWebhookUrl = new sst.Secret(
			"UmaOneDrawTopicDiscordWebhook",
		);

		// Lambda バッチの共通エントリポイントを作成
		const batchFunction = new sst.aws.Function("BatchFunction", {
			handler: "../apps/batch-playground/src/lambda-handler.handler",
			runtime: "nodejs22.x",
			timeout: "30 seconds",
			memory: "128 MB",
			link: [umaOneDrawTopicWebhookUrl],
		});

		// UMA ワンドロお題通知を毎日 JST 12:00 に起動する Scheduler を作成
		new sst.aws.CronV2("UmaOneDrawTopicSchedule", {
			function: batchFunction,
			schedule: "cron(0 12 * * ? *)",
			timezone: "Asia/Tokyo",
			retries: 0,
			event: {
				job: batchRoutes.umaOneDrawTopic,
			},
		});
	},
});
