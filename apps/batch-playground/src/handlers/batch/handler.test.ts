import { beforeEach, describe, expect, it, vi } from "vitest";

import { handler } from "./handler.js";

const jobs = vi.hoisted(() => {
	return {
		umaOneDrawTopicJob: vi.fn(),
		umaOneDrawTopicSchedulerJob: vi.fn(),
		playCheckReminderJob: vi.fn(),
	};
});

vi.mock("./jobs/uma-one-draw-topic.js", () => {
	return { umaOneDrawTopicJob: jobs.umaOneDrawTopicJob };
});
vi.mock("./jobs/uma-one-draw-topic-scheduler.js", () => {
	return { umaOneDrawTopicSchedulerJob: jobs.umaOneDrawTopicSchedulerJob };
});
vi.mock("./jobs/play-check-reminder.js", () => {
	return { playCheckReminderJob: jobs.playCheckReminderJob };
});

beforeEach(() => {
	for (const job of Object.values(jobs)) {
		job.mockReset();
	}
});

describe("handler", () => {
	it("イベントの job を正規化し、対応するジョブへイベントと context を渡す", async () => {
		const response = { ok: true, job: "uma-one-draw-topic" };
		jobs.umaOneDrawTopicJob.mockResolvedValue(response);
		const event = { job: " UMA-ONE-DRAW-TOPIC " };

		await expect(handler(event, "lambda-context")).resolves.toBe(response);
		expect(jobs.umaOneDrawTopicJob).toHaveBeenCalledWith(
			event,
			"lambda-context",
		);
	});

	it("登録済みの全ジョブへ解決する", async () => {
		jobs.umaOneDrawTopicSchedulerJob.mockResolvedValue({
			ok: true,
			job: "uma-one-draw-topic-scheduler",
		});
		jobs.playCheckReminderJob.mockResolvedValue({
			ok: true,
			job: "play-check-reminder",
		});

		await handler({ job: "uma-one-draw-topic-scheduler" });
		await handler({ job: "play-check-reminder" });

		expect(jobs.umaOneDrawTopicSchedulerJob).toHaveBeenCalledOnce();
		expect(jobs.playCheckReminderJob).toHaveBeenCalledOnce();
	});

	it("job が未設定ならエラーにする", async () => {
		await expect(handler({})).rejects.toThrow(
			"有効な job が指定されていません",
		);
	});

	it("job が string でないイベントもエラーにする", async () => {
		await expect(handler({ job: 1 })).rejects.toThrow(
			"有効な job が指定されていません",
		);
	});

	it("未対応の job は入力値を含めずにエラーにする", async () => {
		const unknownJob = "secret-like-value";

		const error = await handler({ job: unknownJob }).catch(
			(caught: unknown) => {
				return caught;
			},
		);

		expect(String(error)).toContain("未対応の batch job です");
		expect(String(error)).not.toContain(unknownJob);
	});
});
