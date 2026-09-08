/// <reference path=".sst/platform/config.d.ts" />

// App name, used as the prefix for the SST app and every AWS resource name
const appName = "eskra-aws-playground";

const siteDomain = "sasahara.uk";

// The R2 bucket lives outside SST (created on the Cloudflare side), so only its name is held here
const mediaBucketName = "eskra-media-library";

export default $config({
	// Base SST app settings; the deploy target is fixed to the develop stage.
	app(input) {
		return {
			name: appName,
			home: "aws",
			removal: "remove",
			// The develop stage is CD-only, so an accidental local sst remove is refused at the CLI level.
			// The run() guard can't cover sst remove, which never evaluates run(), so protect closes that path
			protect: input.stage === "develop",
		};
	},
	async run() {
		// The develop stage is CD-only (GitHub Actions), so locally only the read-only diff is allowed.
		// GITHUB_ACTIONS is checked first, keeping the internal $cli.command off the CD path (&& short-circuits).
		// This guard only covers commands that evaluate run(): deploy, dev, diff, refresh.
		// sst remove never evaluates run() and is refused by app()'s protect instead
		if (
			$app.stage === "develop" &&
			process.env.GITHUB_ACTIONS !== "true" &&
			$cli.command !== "diff"
		) {
			throw new Error(
				"develop stage への変更はローカルから実行できません。main への merge(CD)経由でデプロイしてください。",
			);
		}

		const { jobSchedules } = await import("./config/job-schedules.js");
		const { alarmDescriptions } = await import(
			"./config/alarm-descriptions.js"
		);

		// Discord webhook URL for the UMA one-draw topic notification, held as a Secret
		const umaOneDrawTopicWebhookUrl = new sst.Secret(
			"UmaOneDrawTopicDiscordWebhook",
		);

		// The group the scheduler job's one-time topic-notification schedules belong to
		const umaOneDrawTopicScheduleGroup = new aws.scheduler.ScheduleGroup(
			"UmaOneDrawTopicScheduleGroup",
			{
				name: `${appName}-${$app.stage}-uma-one-draw-topic`,
			},
		);

		// The role a one-time schedule assumes to invoke the batch Lambda. Assumption is narrowed to this
		// schedule group in this account, guarding against a confused deputy
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

		// The Neon pooled connection string the runtime uses, held as a Secret
		const databaseUrl = new sst.Secret("DatabaseUrl");

		// Credentials are kept in a separate Secret per Discord application
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

		// The shared entry point for the Lambda batch jobs
		const batchFunction = new sst.aws.Function("BatchFunction", {
			handler: "../apps/batch-playground/src/handlers/batch/handler.handler",
			runtime: "nodejs22.x",
			timeout: "60 seconds",
			memory: "512 MB",
			link: [umaOneDrawTopicWebhookUrl, yacchoDiscordBotToken],
			environment: {
				DATABASE_URL: databaseUrl.value,
				UMA_ONE_DRAW_TOPIC_SCHEDULE_GROUP_NAME:
					umaOneDrawTopicScheduleGroup.name,
				UMA_ONE_DRAW_TOPIC_SCHEDULER_ROLE_ARN: umaOneDrawTopicScheduleRole.arn,
			},
			permissions: [
				{
					// DeleteSchedule is required to register delete-after-run (ActionAfterCompletion)
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

		// Turns off Lambda's own retries (2 by default) on async invocation from the scheduler,
		// so a job can throw and reach the Errors alarm without posting to Discord twice
		new aws.lambda.FunctionEventInvokeConfig("BatchFunctionEventInvokeConfig", {
			functionName: batchFunction.name,
			maximumRetryAttempts: 0,
		});

		// The batch Lambda reads the role ARN from env, so invoke permission is granted on a separate resource to avoid a cycle
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

		// Carries the follow-up work for an interaction already ACKed with a deferred response.
		// visibilityTimeout is kept at or above the worker's timeout to stop redelivery mid-processing
		const playgroundInteractionDeadLetterQueue = new sst.aws.Queue(
			"PlaygroundInteractionDeadLetterQueue",
		);
		const playgroundInteractionQueue = new sst.aws.Queue(
			"PlaygroundInteractionQueue",
			{
				visibilityTimeout: "1 minute",
				dlq: {
					queue: playgroundInteractionDeadLetterQueue.arn,
					retry: 3,
				},
			},
		);

		// One Lambda holds the whole public endpoint rather than one per job. It returns a deferred
		// response inside Discord's 3-second limit and hands the real work to a worker over the Queue,
		// so it never connects to the DB itself
		const functionUrlFunction = new sst.aws.Function("FunctionUrlFunction", {
			handler: "../apps/function-url-playground/src/handlers/handler.handler",
			runtime: "nodejs22.x",
			timeout: "60 seconds",
			memory: "512 MB",
			link: [
				yacchoDiscordInteractionPublicKey,
				kaguyaDiscordInteractionPublicKey,
				playgroundInteractionQueue,
			],
			url: true,
		});

		// The worker that does the real work for a deferred interaction and replaces the original message
		// with the final content. It calls the Discord API with the interaction token, so no bot token is linked
		playgroundInteractionQueue.subscribe(
			{
				handler:
					"../apps/batch-playground/src/handlers/sqs-worker/handler.handler",
				runtime: "nodejs22.x",
				timeout: "30 seconds",
				memory: "512 MB",
				// repositories (Prisma) contracts the DB connection as the DATABASE_URL env var, so it goes
				// through environment rather than a link
				environment: {
					DATABASE_URL: databaseUrl.value,
				},
			},
			{
				batch: {
					size: 1,
					partialResponses: true,
				},
			},
		);

		// Discord webhook URL for the anime-analysis result notification, held as a Secret
		const animeAnalysisDiscordWebhookUrl = new sst.Secret(
			"AnimeAnalysisDiscordWebhook",
		);

		// The GCP service account key (JSON) that writes to BigQuery, held as a Secret
		const gcpServiceAccountKey = new sst.Secret("GcpServiceAccountKey");

		// The dataset lives outside SST (created by hand on the GCP side), so only its per-stage name is
		// decided here. A BigQuery dataset ID takes only alphanumerics and underscores, so the stage name's
		// punctuation is replaced
		const bigQueryDatasetId =
			$app.stage === "develop"
				? "anime_analysis"
				: `anime_analysis_${$app.stage.replace(/[^a-zA-Z0-9]/g, "_")}`;

		// SQS Queue holding one anime-analysis request per dataSource
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

		// Publishes the runtime dependencies Playwright / Chromium need as a Lambda Layer
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

		// The orchestrator Lambda that builds the anime-analysis plan and enqueues it on SQS
		const animeAnalysisOrchestratorFunction = new sst.aws.Function(
			"AnimeAnalysisOrchestratorFunction",
			{
				handler:
					"../apps/batch-anime-analysis/src/handlers/orchestrator.handler",
				runtime: "nodejs22.x",
				timeout: "60 seconds",
				memory: "512 MB",
				link: [animeAnalysisQueue],
			},
		);

		// The Lambda that exports stored anime metrics to BigQuery one scraped date at a time.
		// Backfilling past dates in one run is part of operations, so the timeout sits near Lambda's maximum
		const animeMetricBigQueryExportFunction = new sst.aws.Function(
			"AnimeMetricBigQueryExportFunction",
			{
				// A backfill is invoked from GitHub Actions, so the name can't be left to generation
				name: `${appName}-${$app.stage}-anime-bigquery-export`,
				handler:
					"../apps/batch-anime-analysis/src/handlers/bigquery-export.handler",
				runtime: "nodejs22.x",
				timeout: "15 minutes",
				memory: "1 GB",
				link: [gcpServiceAccountKey],
				// repositories (Prisma) contracts the DB connection as the DATABASE_URL env var, so it goes
				// through environment rather than a link
				environment: {
					DATABASE_URL: databaseUrl.value,
					BIGQUERY_DATASET: bigQueryDatasetId,
				},
			},
		);

		// The R2 API token (JSON), held as a Secret
		const r2Credentials = new sst.Secret("R2Credentials");

		// Carries thumbnail-generation requests, one at a time.
		// visibilityTimeout is kept at or above the worker's timeout to stop redelivery mid-processing
		const mediaThumbnailDeadLetterQueue = new sst.aws.Queue(
			"MediaThumbnailDeadLetterQueue",
		);
		const mediaThumbnailQueue = new sst.aws.Queue("MediaThumbnailQueue", {
			visibilityTimeout: "6 minutes",
			dlq: {
				queue: mediaThumbnailDeadLetterQueue.arn,
				retry: 3,
			},
		});

		// The layer placing ffmpeg / ffprobe under /opt/bin.
		// Its archive reuses the same bucket as the browser-runtime layer
		const ffmpegLayerObject = new aws.s3.BucketObjectv2(
			"FfmpegLayerObject",
			{
				bucket: browserRuntimeLayerAssetBucket.id,
				contentType: "application/zip",
				key: "layers/ffmpeg.zip",
				serverSideEncryption: "AES256",
				source: $asset("../.tmp/layers/ffmpeg"),
			},
			{
				dependsOn: [browserRuntimeLayerAssetBucketVersioning],
			},
		);
		const ffmpegLayer = new aws.lambda.LayerVersion("FfmpegLayer", {
			compatibleArchitectures: ["x86_64"],
			compatibleRuntimes: ["nodejs22.x"],
			description: "ffmpeg and ffprobe for media thumbnail generation.",
			layerName: `${appName}-${$app.stage}-ffmpeg`,
			s3Bucket: browserRuntimeLayerAssetBucket.id,
			s3Key: ffmpegLayerObject.key,
			s3ObjectVersion: ffmpegLayerObject.versionId,
		});

		// The sync Lambda reconciling R2 against the DB. It shares the batch handler's router, but gets its
		// own Function because a 100k-row upsert doesn't fit the shared batch Lambda's 60 seconds
		const mediaSyncFunction = new sst.aws.Function("MediaSyncFunction", {
			// The management tool's sync button invokes it, so the name can't be left to generation
			name: `${appName}-${$app.stage}-media-sync`,
			handler: "../apps/batch-playground/src/handlers/batch/handler.handler",
			runtime: "nodejs22.x",
			timeout: "15 minutes",
			memory: "1 GB",
			// The job itself takes the one run slot the DB allows; this stops a second invocation
			// from even reaching that check when the cron and a manual start overlap
			concurrency: { reserved: 1 },
			link: [mediaThumbnailQueue],
			// repositories contracts both connections as env vars, so they go through environment
			// rather than a link
			environment: {
				DATABASE_URL: databaseUrl.value,
				R2_CREDENTIALS: r2Credentials.value,
				MEDIA_BUCKET: mediaBucketName,
			},
		});

		// The thumbnail-generation worker. It shares the sqs-worker router but gets its own Function,
		// because it needs the ffmpeg layer and a /tmp to download the original into
		mediaThumbnailQueue.subscribe(
			{
				handler:
					"../apps/batch-playground/src/handlers/sqs-worker/handler.handler",
				runtime: "nodejs22.x",
				timeout: "5 minutes",
				memory: "2 GB",
				storage: "10 GB",
				environment: {
					DATABASE_URL: databaseUrl.value,
					R2_CREDENTIALS: r2Credentials.value,
					MEDIA_BUCKET: mediaBucketName,
				},
				layers: [ffmpegLayer.arn],
			},
			{
				batch: {
					size: 1,
					partialResponses: true,
				},
			},
		);

		// Every cron Scheduler sits behind one !$dev guard, so adding another can't miss it.
		// sst dev is for verifying code locally, and none are created under $dev to keep a cron from firing
		// on after the dev session ends. The timings all live in config/job-schedules
		if (!$dev) {
			new sst.aws.CronV2("UmaOneDrawTopicSchedulerSchedule", {
				function: batchFunction,
				...jobSchedules.umaOneDrawTopicScheduler,
			});
			new sst.aws.CronV2("PlayCheckReminderSchedule", {
				function: batchFunction,
				...jobSchedules.playCheckReminder,
			});
			new sst.aws.CronV2("AnimeAnalysisSchedule9", {
				function: animeAnalysisOrchestratorFunction,
				...jobSchedules.animeScrapingOrchestrator9,
			});
			new sst.aws.CronV2("AnimeAnalysisSchedule23", {
				function: animeAnalysisOrchestratorFunction,
				...jobSchedules.animeScrapingOrchestrator23,
			});
			new sst.aws.CronV2("MediaSyncSchedule", {
				function: mediaSyncFunction,
				...jobSchedules.mediaSync,
			});
			new sst.aws.CronV2("AnimeMetricBigQueryExportSchedule", {
				function: animeMetricBigQueryExportFunction,
				...jobSchedules.animeMetricBigQueryExport,
			});
		}

		// The worker Lambda running one anime-analysis scrape per SQS message
		animeAnalysisQueue.subscribe(
			{
				handler: "../apps/batch-anime-analysis/src/handlers/sqs-worker.handler",
				runtime: "nodejs22.x",
				timeout: "2 minutes",
				memory: "2 GB",
				link: [animeAnalysisDiscordWebhookUrl],
				// repositories (Prisma) contracts the DB connection as the DATABASE_URL env var, so it goes
				// through environment rather than a link (the same path the tests outside SST take)
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

		const staticSite = new sst.aws.StaticSite("StaticSitePlayground", {
			path: "../apps/static-site-playground",
			build: {
				command: "npm run build",
				output: "dist",
			},
			domain: $app.stage === "develop" ? { name: siteDomain } : undefined,
			assets: {
				// Unknown paths go to S3 too; a missing key returns the origin's own error
				routes: ["/"],
			},
			dev: false,
		});

		// Discord webhook URL for batch-failure alerts, held as a Secret
		const alertDiscordWebhookUrl = new sst.Secret("AlertDiscordWebhook");

		// The notifier Lambda that takes a CloudWatch alarm and posts it to Discord
		const alertNotifierFunction = new sst.aws.Function(
			"AlertNotifierFunction",
			{
				handler:
					"../apps/batch-anime-analysis/src/handlers/alarm-notifier.handler",
				runtime: "nodejs22.x",
				timeout: "60 seconds",
				memory: "512 MB",
				link: [alertDiscordWebhookUrl],
			},
		);

		// The SNS Topic every CloudWatch alarm notifies, with the notifier Lambda subscribed
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

		// Watches a Lambda's Errors metric on shared settings and sends the alert to Discord
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

		// Notifies when a worker exhausts its retries and messages pile up in the DLQ
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

		// Notifies when thumbnail generation exhausts its retries and piles up in the DLQ.
		// Left alone, that media sits in the listing without a thumbnail indefinitely
		new aws.cloudwatch.MetricAlarm("MediaThumbnailDlqDepthAlarm", {
			name: `${appName}-${$app.stage}-media-thumbnail-dlq-depth`,
			alarmDescription: alarmDescriptions.mediaThumbnailDlqDepth,
			namespace: "AWS/SQS",
			metricName: "ApproximateNumberOfMessagesVisible",
			dimensions: {
				QueueName: mediaThumbnailDeadLetterQueue.arn.apply((arn) => {
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

		// Notifies when an interaction follow-up job exhausts its retries and piles up in the DLQ.
		// Otherwise the original message stays deferred and never settles
		new aws.cloudwatch.MetricAlarm("PlaygroundInteractionDlqDepthAlarm", {
			name: `${appName}-${$app.stage}-playground-interaction-dlq-depth`,
			alarmDescription: alarmDescriptions.playgroundInteractionDlqDepth,
			namespace: "AWS/SQS",
			metricName: "ApproximateNumberOfMessagesVisible",
			dimensions: {
				QueueName: playgroundInteractionDeadLetterQueue.arn.apply((arn) => {
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

		// Notifies on errors from the schedule-triggered orchestrator, which has no DLQ
		createLambdaErrorAlarm("AnimeAnalysisOrchestratorErrorAlarm", {
			name: `${appName}-${$app.stage}-anime-orchestrator-errors`,
			description: alarmDescriptions.animeAnalysisOrchestratorError,
			functionName: animeAnalysisOrchestratorFunction.name,
		});

		// Notifies on errors from the schedule-triggered BigQuery export Lambda, which has no DLQ.
		// Left alone, the analysis side stops at the previous day
		createLambdaErrorAlarm("AnimeMetricBigQueryExportErrorAlarm", {
			name: `${appName}-${$app.stage}-anime-bigquery-export-errors`,
			description: alarmDescriptions.animeMetricBigQueryExportError,
			functionName: animeMetricBigQueryExportFunction.name,
		});

		// Notifies on errors from the schedule-triggered batch Lambda, which has no DLQ.
		// If the midnight scheduler job fails, that day's topic notification is skipped entirely
		createLambdaErrorAlarm("PlaygroundBatchErrorAlarm", {
			name: `${appName}-${$app.stage}-playground-batch-errors`,
			description: alarmDescriptions.playgroundBatchError,
			functionName: batchFunction.name,
		});

		// Notifies on errors from the schedule-triggered sync Lambda, which has no DLQ.
		// Left alone, media put into R2 never shows up in the management tool
		createLambdaErrorAlarm("MediaSyncErrorAlarm", {
			name: `${appName}-${$app.stage}-media-sync-errors`,
			description: alarmDescriptions.mediaSyncError,
			functionName: mediaSyncFunction.name,
		});

		// A failing public-endpoint Lambda can't answer an HTTP request (a button press, say), so it is watched
		createLambdaErrorAlarm("FunctionUrlErrorAlarm", {
			name: `${appName}-${$app.stage}-function-url-errors`,
			description: alarmDescriptions.functionUrlError,
			functionName: functionUrlFunction.name,
		});

		// functionUrl is registered as the Interactions Endpoint URL in the Discord Developer Portal
		return {
			functionUrl: functionUrlFunction.url,
			siteUrl: staticSite.url,
		};
	},
});
