/// <reference path=".sst/platform/config.d.ts" />

// SST app と AWS リソース名の接頭辞として使うアプリ名
const appName = "eskra-aws-playground";

export default $config({
	// SST app の基本設定。デプロイ先は develop stage 固定。
	app() {
		return {
			name: appName,
			home: "aws",
			removal: "remove",
		};
	},
	async run() {
		const { jobSchedules } = await import("./config/job-schedules.js");
		const { alarmDescriptions } = await import(
			"./config/alarm-descriptions.js"
		);

		// UMA ワンドロお題通知用の Discord Webhook URL を Secret として扱う
		const umaOneDrawTopicWebhookUrl = new sst.Secret(
			"UmaOneDrawTopicDiscordWebhook",
		);

		// scheduler job が登録するお題通知の one-time schedule を所属させる group
		const umaOneDrawTopicScheduleGroup = new aws.scheduler.ScheduleGroup(
			"UmaOneDrawTopicScheduleGroup",
			{
				name: `${appName}-${$app.stage}-uma-one-draw-topic`,
			},
		);

		// one-time schedule が batch Lambda を起動するときに引き受ける role。
		// confused deputy 対策として、自アカウントのこの schedule group からの引き受けに限定する
		const callerIdentity = aws.getCallerIdentityOutput({});
		const umaOneDrawTopicScheduleRole = new aws.iam.Role(
			"UmaOneDrawTopicScheduleRole",
			{
				assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
					statements: [
						{
							actions: ["sts:AssumeRole"],
							principals: [
								{
									type: "Service",
									identifiers: ["scheduler.amazonaws.com"],
								},
							],
							conditions: [
								{
									test: "StringEquals",
									variable: "aws:SourceAccount",
									values: [callerIdentity.accountId],
								},
								{
									test: "ArnLike",
									variable: "aws:SourceArn",
									values: [umaOneDrawTopicScheduleGroup.arn],
								},
							],
						},
					],
				}).json,
			},
		);

		// runtime が利用する Neon pooled 接続文字列を Secret として扱う
		const databaseUrl = new sst.Secret("DatabaseUrl");

		// Discord application ごとの認証情報を Secret として分離する
		const yacchoDiscordBotToken = new sst.Secret("YacchoDiscordBotToken");
		const yacchoDiscordInteractionPublicKey = new sst.Secret(
			"YacchoDiscordInteractionPublicKey",
		);
		new sst.Secret("YacchoDiscordApplicationId");
		new sst.Secret("KaguyaDiscordBotToken");
		const kaguyaDiscordInteractionPublicKey = new sst.Secret(
			"KaguyaDiscordInteractionPublicKey",
		);
		new sst.Secret("KaguyaDiscordApplicationId");

		// Lambda バッチの共通エントリポイントを作成
		const batchFunction = new sst.aws.Function("BatchFunction", {
			handler: "../apps/batch-playground/src/handlers/batch/handler.handler",
			runtime: "nodejs22.x",
			timeout: "30 seconds",
			memory: "128 MB",
			link: [umaOneDrawTopicWebhookUrl, yacchoDiscordBotToken],
			environment: {
				DATABASE_URL: databaseUrl.value,
				UMA_ONE_DRAW_TOPIC_SCHEDULE_GROUP_NAME:
					umaOneDrawTopicScheduleGroup.name,
				UMA_ONE_DRAW_TOPIC_SCHEDULER_ROLE_ARN: umaOneDrawTopicScheduleRole.arn,
			},
			permissions: [
				{
					// DeleteSchedule は実行後自動削除(ActionAfterCompletion)の登録に必要
					actions: ["scheduler:CreateSchedule", "scheduler:DeleteSchedule"],
					resources: [
						$interpolate`arn:aws:scheduler:*:*:schedule/${umaOneDrawTopicScheduleGroup.name}/*`,
					],
				},
				{
					actions: ["iam:PassRole"],
					resources: [umaOneDrawTopicScheduleRole.arn],
				},
			],
		});

		// scheduler からの非同期起動に対する Lambda 自体の自動リトライ(既定 2 回)を止める。
		// これにより job は失敗を throw して Errors アラームへ届けても Discord 投稿が重複しない
		new aws.lambda.FunctionEventInvokeConfig("BatchFunctionEventInvokeConfig", {
			functionName: batchFunction.name,
			maximumRetryAttempts: 0,
		});

		// batch Lambda が env で role ARN を参照するため、循環参照を避けて invoke 権限は別リソースで付与する
		new aws.iam.RolePolicy("UmaOneDrawTopicScheduleRolePolicy", {
			role: umaOneDrawTopicScheduleRole.id,
			policy: aws.iam.getPolicyDocumentOutput({
				statements: [
					{
						actions: ["lambda:InvokeFunction"],
						resources: [
							batchFunction.arn,
							$interpolate`${batchFunction.arn}:*`,
						],
					},
				],
			}).json,
		});

		// UMA ワンドロお題 scheduler job の Scheduler を作成。実行タイミングは config/job-schedules で一元管理する
		new sst.aws.CronV2("UmaOneDrawTopicSchedulerSchedule", {
			function: batchFunction,
			...jobSchedules.umaOneDrawTopicScheduler,
		});

		// 遊技チェックリマインダーの Scheduler を作成。実行タイミングは config/job-schedules で一元管理する
		new sst.aws.CronV2("PlayCheckReminderSchedule", {
			function: batchFunction,
			...jobSchedules.playCheckReminder,
		});

		// 公開エンドポイントは job ごとに増やさずこの Lambda 1 つに集約する。
		const functionUrlFunction = new sst.aws.Function("FunctionUrlFunction", {
			handler:
				"../apps/batch-playground/src/handlers/function-url/handler.handler",
			runtime: "nodejs22.x",
			timeout: "10 seconds",
			memory: "512 MB",
			link: [
				yacchoDiscordInteractionPublicKey,
				kaguyaDiscordInteractionPublicKey,
			],
			environment: {
				DATABASE_URL: databaseUrl.value,
			},
			url: true,
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
			visibilityTimeout: "12 minutes",
			dlq: {
				queue: animeAnalysisDeadLetterQueue.arn,
				retry: 3,
			},
		});

		const browserRuntimeLayerAssetBucket = new aws.s3.Bucket(
			"BrowserRuntimeLayerAssetBucket",
			{
				bucketPrefix: `sst-asset-lbp-${$app.stage}-br-`,
				forceDestroy: true,
			},
		);
		new aws.s3.BucketPublicAccessBlock(
			"BrowserRuntimeLayerAssetBucketPublicAccessBlock",
			{
				blockPublicAcls: true,
				blockPublicPolicy: true,
				bucket: browserRuntimeLayerAssetBucket.id,
				ignorePublicAcls: true,
				restrictPublicBuckets: true,
			},
		);
		const browserRuntimeLayerAssetBucketVersioning =
			new aws.s3.BucketVersioning("BrowserRuntimeLayerAssetBucketVersioning", {
				bucket: browserRuntimeLayerAssetBucket.id,
				versioningConfiguration: {
					status: "Enabled",
				},
			});
		new aws.s3.BucketLifecycleConfiguration(
			"BrowserRuntimeLayerAssetBucketLifecycleConfiguration",
			{
				bucket: browserRuntimeLayerAssetBucket.id,
				rules: [
					{
						filter: {
							prefix: "layers/",
						},
						id: "expire-noncurrent-layer-archives",
						noncurrentVersionExpiration: {
							noncurrentDays: 1,
						},
						status: "Enabled",
					},
				],
			},
		);
		const browserRuntimeLayerObject = new aws.s3.BucketObjectv2(
			"BrowserRuntimeLayerObject",
			{
				bucket: browserRuntimeLayerAssetBucket.id,
				contentType: "application/zip",
				key: "layers/browser-runtime.zip",
				serverSideEncryption: "AES256",
				source: $asset("../.tmp/layers/browser-runtime"),
			},
			{
				dependsOn: [browserRuntimeLayerAssetBucketVersioning],
			},
		);

		// Playwright / Chromium 実行に必要な runtime 依存を Lambda Layer として発行する
		const browserRuntimeLayer = new aws.lambda.LayerVersion(
			"BrowserRuntimeLayer",
			{
				compatibleArchitectures: ["x86_64"],
				compatibleRuntimes: ["nodejs22.x"],
				description:
					"Browser runtime dependencies for anime analysis scraping worker.",
				layerName: `${appName}-${$app.stage}-browser-runtime`,
				s3Bucket: browserRuntimeLayerAssetBucket.id,
				s3Key: browserRuntimeLayerObject.key,
				s3ObjectVersion: browserRuntimeLayerObject.versionId,
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

		// アニメ分析 Orchestrator の Scheduler を作成。実行タイミングは config/job-schedules で一元管理する
		new sst.aws.CronV2("AnimeAnalysisSchedule9", {
			function: animeAnalysisOrchestratorFunction,
			...jobSchedules.animeScrapingOrchestrator9,
		});
		new sst.aws.CronV2("AnimeAnalysisSchedule23", {
			function: animeAnalysisOrchestratorFunction,
			...jobSchedules.animeScrapingOrchestrator23,
		});

		// SQS message ごとにアニメ分析スクレイピングを実行する Worker Lambda を作成
		animeAnalysisQueue.subscribe(
			{
				handler: "../apps/batch-anime-analysis/src/handlers/sqs-worker.handler",
				runtime: "nodejs22.x",
				timeout: "2 minutes",
				memory: "2 GB",
				link: [animeAnalysisDiscordWebhookUrl],
				// DB 接続は repositories(Prisma)側の契約が DATABASE_URL env var のため、
				// link ではなく environment で渡す(SST 外のテストと同一経路にする)
				environment: {
					DATABASE_URL: databaseUrl.value,
				},
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

		// バッチ失敗を通知するためのアラート用 Discord Webhook URL を Secret として扱う
		const alertDiscordWebhookUrl = new sst.Secret("AlertDiscordWebhook");

		// CloudWatch alarm を受けて Discord へ通知する Notifier Lambda を作成
		const alertNotifierFunction = new sst.aws.Function(
			"AlertNotifierFunction",
			{
				handler:
					"../apps/batch-anime-analysis/src/handlers/alarm-notifier.handler",
				runtime: "nodejs22.x",
				timeout: "30 seconds",
				memory: "128 MB",
				link: [alertDiscordWebhookUrl],
			},
		);

		// CloudWatch alarm の通知先となる SNS Topic を作り Notifier Lambda を購読させる
		const alertTopic = new aws.sns.Topic("AlertTopic", {
			name: `${appName}-${$app.stage}-alerts`,
		});
		const alertNotifierInvokePermission = new aws.lambda.Permission(
			"AlertNotifierInvokePermission",
			{
				action: "lambda:InvokeFunction",
				function: alertNotifierFunction.name,
				principal: "sns.amazonaws.com",
				sourceArn: alertTopic.arn,
			},
		);
		new aws.sns.TopicSubscription(
			"AlertTopicSubscription",
			{
				topic: alertTopic.arn,
				protocol: "lambda",
				endpoint: alertNotifierFunction.arn,
			},
			{ dependsOn: [alertNotifierInvokePermission] },
		);

		// Lambda の Errors メトリクスを共通設定で監視し、アラートを Discord へ通知する
		const createLambdaErrorAlarm = (
			resourceName: string,
			args: {
				name: string;
				description: string;
				functionName: $util.Input<string>;
			},
		) => {
			return new aws.cloudwatch.MetricAlarm(resourceName, {
				name: args.name,
				alarmDescription: args.description,
				namespace: "AWS/Lambda",
				metricName: "Errors",
				dimensions: {
					FunctionName: args.functionName,
				},
				statistic: "Sum",
				period: 300,
				evaluationPeriods: 1,
				threshold: 1,
				comparisonOperator: "GreaterThanOrEqualToThreshold",
				treatMissingData: "notBreaching",
				alarmActions: [alertTopic.arn],
			});
		};

		// worker が規定回数リトライしても失敗し DLQ にメッセージが滞留したら通知する
		new aws.cloudwatch.MetricAlarm("AnimeAnalysisDlqDepthAlarm", {
			name: `${appName}-${$app.stage}-anime-dlq-depth`,
			alarmDescription: alarmDescriptions.animeAnalysisDlqDepth,
			namespace: "AWS/SQS",
			metricName: "ApproximateNumberOfMessagesVisible",
			dimensions: {
				QueueName: animeAnalysisDeadLetterQueue.arn.apply((arn) => {
					return arn.split(":").pop() ?? "";
				}),
			},
			statistic: "Maximum",
			period: 300,
			evaluationPeriods: 1,
			threshold: 1,
			comparisonOperator: "GreaterThanOrEqualToThreshold",
			treatMissingData: "notBreaching",
			alarmActions: [alertTopic.arn],
		});

		// DLQ を持たない schedule 起動の orchestrator のエラーを通知する
		createLambdaErrorAlarm("AnimeAnalysisOrchestratorErrorAlarm", {
			name: `${appName}-${$app.stage}-anime-orchestrator-errors`,
			description: alarmDescriptions.animeAnalysisOrchestratorError,
			functionName: animeAnalysisOrchestratorFunction.name,
		});

		// DLQ を持たない schedule 起動の batch Lambda のエラーを通知する。
		// 深夜の scheduler job が失敗するとその日のお題通知が丸ごとスキップされるため検知が必要
		createLambdaErrorAlarm("PlaygroundBatchErrorAlarm", {
			name: `${appName}-${$app.stage}-playground-batch-errors`,
			description: alarmDescriptions.playgroundBatchError,
			functionName: batchFunction.name,
		});

		// 公開エンドポイント Lambda が失敗すると HTTP リクエスト(ボタン押下など)に応答できないため検知する
		createLambdaErrorAlarm("FunctionUrlErrorAlarm", {
			name: `${appName}-${$app.stage}-function-url-errors`,
			description: alarmDescriptions.functionUrlError,
			functionName: functionUrlFunction.name,
		});

		// デプロイ後に Discord Developer Portal へ登録する Interactions Endpoint URL を出力する
		return {
			functionUrl: functionUrlFunction.url,
		};
	},
});
