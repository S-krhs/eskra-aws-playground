// In scope: registering a one-time EventBridge Scheduler schedule via the AWS SDK
// Out of scope: deciding the run time, resolving the schedule name or target ARN, Lambda event parsing
import {
	ConflictException,
	CreateScheduleCommand,
	SchedulerClient,
} from "@aws-sdk/client-scheduler";

export interface OneTimeScheduleInput {
	/** Unique within `groupName`. */
	name: string;
	groupName: string;
	/** Local to `timezone`, as `YYYY-MM-DDTHH:mm:ss`. */
	scheduleAt: string;
	/** IANA zone `scheduleAt` is interpreted in. */
	timezone: string;
	targetArn: string;
	/** Role EventBridge Scheduler assumes to invoke the target. */
	roleArn: string;
	input: unknown;
}

export interface OneTimeScheduleResult {
	/** false means a schedule with this name already exists, not an error. */
	created: boolean;
}

/** Registers a one-time schedule that deletes itself after it fires. */
export class OneTimeScheduleClient {
	private readonly client = new SchedulerClient({});

	public async createSchedule(
		schedule: OneTimeScheduleInput,
	): Promise<OneTimeScheduleResult> {
		try {
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
						// Only retries a delivery failure before Lambda accepts the invoke — never a duplicate run
						RetryPolicy: { MaximumRetryAttempts: 3 },
					},
				}),
			);
		} catch (error) {
			if (error instanceof ConflictException) {
				return { created: false };
			}
			throw error;
		}

		return { created: true };
	}
}
