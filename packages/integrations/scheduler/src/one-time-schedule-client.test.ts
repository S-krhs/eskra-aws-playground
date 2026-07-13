import { afterEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => {
	return vi.fn();
});

vi.mock("@aws-sdk/client-scheduler", () => {
	return {
		SchedulerClient: class {
			send = send;
		},
		CreateScheduleCommand: class {
			public constructor(public readonly input: unknown) {}
		},
	};
});

import { OneTimeScheduleClient } from "./one-time-schedule-client.js";

describe("OneTimeScheduleClient", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("実行後に自動削除される one-time schedule として登録する", async () => {
		send.mockResolvedValue({});
		const client = new OneTimeScheduleClient();

		await client.createSchedule({
			name: "uma-one-draw-topic-2026-07-14",
			groupName: "example-group",
			scheduleAt: "2026-07-14T13:47:00",
			timezone: "Asia/Tokyo",
			targetArn: "arn:aws:lambda:ap-northeast-1:123456789012:function:batch",
			roleArn: "arn:aws:iam::123456789012:role/example-role",
			input: { job: "uma-one-draw-topic" },
		});

		expect(send).toHaveBeenCalledTimes(1);
		const command = send.mock.calls[0]?.[0] as { input: unknown };
		expect(command.input).toEqual({
			Name: "uma-one-draw-topic-2026-07-14",
			GroupName: "example-group",
			ScheduleExpression: "at(2026-07-14T13:47:00)",
			ScheduleExpressionTimezone: "Asia/Tokyo",
			FlexibleTimeWindow: { Mode: "OFF" },
			ActionAfterCompletion: "DELETE",
			Target: {
				Arn: "arn:aws:lambda:ap-northeast-1:123456789012:function:batch",
				RoleArn: "arn:aws:iam::123456789012:role/example-role",
				Input: JSON.stringify({ job: "uma-one-draw-topic" }),
				RetryPolicy: { MaximumRetryAttempts: 0 },
			},
		});
	});
});
