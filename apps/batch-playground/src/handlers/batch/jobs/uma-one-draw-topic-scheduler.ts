// In scope: UMA ワンドロお題通知の one-time schedule 登録をオーケストレーションする
// Out of scope: 起動時刻の決定ロジックや EventBridge Scheduler API 通信の詳細を持つ
import { OneTimeScheduleClient } from "@eskra-aws-playground/integration-scheduler/one-time-schedule-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";

import { planOneTimeInvocation } from "@/features/uma-one-draw-topic-scheduler/one-time-invocation-plan.js";
import {
	type BatchResponse,
	batchContextSchema,
} from "@/handlers/batch/schema.js";

const logger = createBatchLogger("uma-one-draw-topic-scheduler");

/** UMA ワンドロお題通知を当日ランダムな時刻に起動する one-time schedule を登録するバッチジョブ。 */
export const umaOneDrawTopicSchedulerJob = async (
	_event: unknown,
	context?: unknown,
): Promise<BatchResponse> => {
	// 1. SST が設定する環境変数から schedule group・role を、Lambda context から起動対象の ARN を解決する。
	const scheduleGroupName = process.env.UMA_ONE_DRAW_TOPIC_SCHEDULE_GROUP_NAME;
	const schedulerRoleArn = process.env.UMA_ONE_DRAW_TOPIC_SCHEDULER_ROLE_ARN;

	if (!scheduleGroupName || !schedulerRoleArn) {
		throw new Error("scheduler の実行時設定(環境変数)が設定されていません。");
	}

	const parsedContext = batchContextSchema.safeParse(context);

	if (!parsedContext.success) {
		throw new Error("Lambda context から起動対象の ARN を解決できません。");
	}

	const targetFunctionArn = parsedContext.data.invokedFunctionArn;

	logger.start();

	// 2. feature で当日の起動 window 内からランダムな起動時刻の実行計画を作る。
	const invocationPlan = planOneTimeInvocation();

	// 3. EventBridge Scheduler integration へ one-time schedule の登録を委譲する。
	//    当日分が登録済み(同名 schedule が存在)の場合は二重登録せず正常終了する。
	const scheduleClient = new OneTimeScheduleClient();
	const { created } = await scheduleClient.createSchedule({
		name: invocationPlan.scheduleName,
		groupName: scheduleGroupName,
		scheduleAt: invocationPlan.scheduleAt,
		timezone: invocationPlan.timezone,
		targetArn: targetFunctionArn,
		roleArn: schedulerRoleArn,
		input: { job: "uma-one-draw-topic" },
	});

	logger.complete({ scheduleAt: invocationPlan.scheduleAt, created });

	// 4. Lambda ハンドラーへ共通レスポンスを返す。
	return {
		ok: true,
		job: "uma-one-draw-topic-scheduler",
		details: {
			scheduleAt: invocationPlan.scheduleAt,
			created,
		},
	};
};
