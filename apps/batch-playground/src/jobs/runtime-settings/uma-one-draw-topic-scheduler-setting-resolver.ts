// In scope: UMA ワンドロお題 scheduler job が使う実行時設定の型と、環境変数・Lambda context からの解決を提供する
// Out of scope: Lambda イベント解釈、起動時刻の決定、schedule の登録を行う
import { batchContextSchema } from "../../shared/schemas/lambda/batch/context.js";

/** UMA ワンドロお題 scheduler job が使う実行時設定。 */
export interface UmaOneDrawTopicSchedulerSettings {
	/** one-time schedule を所属させる schedule group 名。 */
	scheduleGroupName: string;
	/** one-time schedule が起動時に引き受ける role の ARN。 */
	schedulerRoleArn: string;
}

const requireEnv = (name: string): string => {
	const value = (process.env[name] ?? "").trim();

	if (!value) {
		throw new Error(`${name} が設定されていません。`);
	}

	return value;
};

/** UMA ワンドロお題 scheduler job が使う実行時設定を解決する。 */
export const getUmaOneDrawTopicSchedulerSettings =
	(): UmaOneDrawTopicSchedulerSettings => {
		return {
			scheduleGroupName: requireEnv("UMA_ONE_DRAW_TOPIC_SCHEDULE_GROUP_NAME"),
			schedulerRoleArn: requireEnv("UMA_ONE_DRAW_TOPIC_SCHEDULER_ROLE_ARN"),
		};
	};

/** one-time schedule の起動対象(この Lambda 自身)の ARN を Lambda context から解決する。ローカル実行では環境変数で代替する。 */
export const resolveTargetFunctionArn = (context: unknown): string => {
	const parsedContext = batchContextSchema.safeParse(context);

	if (parsedContext.success) {
		return parsedContext.data.invokedFunctionArn;
	}

	const localTargetFunctionArn = (
		process.env.UMA_ONE_DRAW_TOPIC_TARGET_FUNCTION_ARN ?? ""
	).trim();

	if (localTargetFunctionArn) {
		return localTargetFunctionArn;
	}

	throw new Error(
		"Lambda context または UMA_ONE_DRAW_TOPIC_TARGET_FUNCTION_ARN から起動対象の ARN を解決できません。",
	);
};
