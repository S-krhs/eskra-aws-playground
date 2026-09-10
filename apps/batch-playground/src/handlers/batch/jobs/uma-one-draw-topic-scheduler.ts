// In scope: orchestrating registration of the one-time schedule for the UMA one-draw topic notification
// Out of scope: how the firing time is picked, EventBridge Scheduler API detail
import { OneTimeScheduleClient } from "@eskra-aws-playground/integration-scheduler/one-time-schedule-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";

import { planOneTimeInvocation } from "@/features/uma-one-draw-topic-scheduler/one-time-invocation-plan.js";
import { batchJobNames } from "@/handlers/batch/contracts/job-names.js";
import {
	type BatchResponse,
	batchContextSchema,
} from "@/handlers/batch/schema.js";

const logger = createBatchLogger(batchJobNames.umaOneDrawTopicScheduler);

/** The batch job registering the one-time schedule that fires the topic notification at a random time that day. */
export const umaOneDrawTopicSchedulerJob = async (
	_event: unknown,
	context?: unknown,
): Promise<BatchResponse> => {
	// 1. Resolve the schedule group and role from the env vars SST sets, and the target ARN from the Lambda context.
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

	// 2. Build the plan in the feature, picking a random firing time inside that day's window.
	const invocationPlan = planOneTimeInvocation();

	// 3. Delegate registering the one-time schedule to the EventBridge Scheduler integration.
	//    If that day's is already registered (a schedule of the same name exists), it succeeds without registering again.
	const scheduleClient = new OneTimeScheduleClient();
	const { created } = await scheduleClient.createSchedule({
		name: invocationPlan.scheduleName,
		groupName: scheduleGroupName,
		scheduleAt: invocationPlan.scheduleAt,
		timezone: invocationPlan.timezone,
		targetArn: targetFunctionArn,
		roleArn: schedulerRoleArn,
		input: { job: batchJobNames.umaOneDrawTopic },
	});

	logger.complete({ scheduleAt: invocationPlan.scheduleAt, created });

	// 4. Return the shared response to the Lambda handler.
	return {
		ok: true,
		job: batchJobNames.umaOneDrawTopicScheduler,
		details: {
			scheduleAt: invocationPlan.scheduleAt,
			created,
		},
	};
};
