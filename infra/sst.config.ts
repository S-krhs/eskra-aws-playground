/// <reference path=".sst/platform/config.d.ts" />

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
		const { batchNames } = await import(
			"../apps/batch-anime-analysis/src/shared/routes/batch-names.js"
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

		// アニメ分析結果通知用の Discord Webhook URL を Secret として扱う
		const animeAnalysisDiscordWebhookUrl = new sst.Secret(
			"AnimeAnalysisDiscordWebhook",
		);

		// アニメ分析の実行要求を dataSource 単位で保持する SQS Queue を作成
		const animeAnalysisDeadLetterQueue = new sst.aws.Queue(
			"AnimeAnalysisDeadLetterQueue",
		);
		const animeAnalysisQueue = new sst.aws.Queue("AnimeAnalysisQueue", {
			visibilityTimeout: "6 minutes",
			dlq: {
				queue: animeAnalysisDeadLetterQueue.arn,
				retry: 3,
			},
		});

		// Playwright / Chromium 実行に必要な runtime 依存を Lambda Layer として発行する
		const browserRuntimeLayer = new aws.lambda.LayerVersion(
			"BrowserRuntimeLayer",
			{
				code: $asset(".tmp/layers/browser-runtime"),
				compatibleArchitectures: ["x86_64"],
				compatibleRuntimes: ["nodejs22.x"],
				description:
					"Browser runtime dependencies for anime analysis scraping worker.",
				layerName: `${appName}-${$app.stage}-browser-runtime`,
			},
		);

		// アニメ分析の実行計画を作り、SQS に投入する Orchestrator Lambda を作成
		const animeAnalysisOrchestratorFunction = new sst.aws.Function(
			"AnimeAnalysisOrchestratorFunction",
			{
				handler:
					"../apps/batch-anime-analysis/src/handlers/orchestrator.handler",
				runtime: "nodejs22.x",
				timeout: "30 seconds",
				memory: "128 MB",
				link: [animeAnalysisQueue],
			},
		);

		// アニメ分析 Orchestrator を毎日 JST 09:00 に起動する Scheduler を作成
		new sst.aws.CronV2("AnimeAnalysisSchedule", {
			function: animeAnalysisOrchestratorFunction,
			schedule: "cron(0 9 * * ? *)",
			timezone: "Asia/Tokyo",
			retries: 0,
			event: {
				job: batchNames.animeScrapingOrchestrator,
			},
		});

		// SQS message ごとにアニメ分析スクレイピングを実行する Worker Lambda を作成
		animeAnalysisQueue.subscribe(
			{
				handler: "../apps/batch-anime-analysis/src/handlers/sqs-worker.handler",
				runtime: "nodejs22.x",
				timeout: "5 minutes",
				memory: "1 GB",
				link: [animeAnalysisDiscordWebhookUrl],
				layers: [browserRuntimeLayer.arn],
				nodejs: {
					esbuild: {
						external: [
							"@sparticuz/chromium",
							"chromium-bidi",
							"playwright-core",
						],
					},
				},
			},
			{
				batch: {
					size: 1,
					partialResponses: true,
				},
			},
		);
	},
});
