// In scope: AWS SDK を使って EventBridge Scheduler へ one-time schedule を登録する
// Out of scope: 実行時刻の決定、schedule 名や対象 ARN の解決、Lambda イベント解釈を持つ
import {
	CreateScheduleCommand,
	SchedulerClient,
} from "@aws-sdk/client-scheduler";

/** 登録する one-time schedule の最小入力。 */
export interface OneTimeScheduleInput {
	/** schedule 名。group 内で一意にする。 */
	name: string;
	/** schedule を所属させる schedule group 名。 */
	groupName: string;
	/** 起動時刻。timezone ローカルの YYYY-MM-DDTHH:mm:ss 形式。 */
	scheduleAt: string;
	/** scheduleAt を解釈する IANA タイムゾーン。 */
	timezone: string;
	/** 起動対象の ARN。 */
	targetArn: string;
	/** EventBridge Scheduler が起動時に引き受ける role の ARN。 */
	roleArn: string;
	/** 起動対象へ渡すイベント。 */
	input: unknown;
}

/** AWS SDK を使って、実行後に自動削除される one-time schedule を登録するクライアント。 */
export class OneTimeScheduleClient {
	private readonly client = new SchedulerClient({});

	public async createSchedule(schedule: OneTimeScheduleInput): Promise<void> {
		await this.client.send(
			new CreateScheduleCommand({
				Name: schedule.name,
				GroupName: schedule.groupName,
				ScheduleExpression: `at(${schedule.scheduleAt})`,
				ScheduleExpressionTimezone: schedule.timezone,
				FlexibleTimeWindow: { Mode: "OFF" },
				ActionAfterCompletion: "DELETE",
				Target: {
					Arn: schedule.targetArn,
					RoleArn: schedule.roleArn,
					Input: JSON.stringify(schedule.input),
					RetryPolicy: { MaximumRetryAttempts: 0 },
				},
			}),
		);
	}
}
