import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";

const syncRunRepository = vi.hoisted(() => {
	return { findLatest: vi.fn(), findUnfinished: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-sync-run/repository.js",
	() => {
		return { mediaSyncRunRepository: syncRunRepository };
	},
);

const lambda = vi.hoisted(() => {
	return { invokeEvent: vi.fn() };
});

vi.mock("@eskra-aws-playground/integration-lambda/lambda-invoker.js", () => {
	return {
		LambdaInvoker: class {
			invokeEvent = lambda.invokeEvent;
		},
	};
});

const uiOrigin = "http://127.0.0.1:7420";
const runId = "33333333-3333-4333-8333-333333333333";
const startedAt = new Date("2026-02-03T04:05:06.000Z");

const finishedRun = {
	id: runId,
	startedAt,
	finishedAt: new Date("2026-02-03T04:10:06.000Z"),
	scannedCount: 10,
	insertedCount: 2,
	updatedCount: 1,
	deletedCount: 0,
	error: null,
};

beforeEach(() => {
	process.env.MEDIA_SYNC_FUNCTION_NAME = "media-sync";
	syncRunRepository.findLatest.mockReset();
	syncRunRepository.findLatest.mockResolvedValue(finishedRun);
	syncRunRepository.findUnfinished.mockReset();
	syncRunRepository.findUnfinished.mockResolvedValue(undefined);
	lambda.invokeEvent.mockReset();
	lambda.invokeEvent.mockResolvedValue(undefined);
});

describe("startSync", () => {
	it("asks the sync Lambda to run and answers with an empty acceptance", async () => {
		const response = await createApp().request(`${uiOrigin}/api/sync`, {
			method: "POST",
			headers: { origin: uiOrigin },
		});

		expect(response.status).toBe(202);
		expect(await response.text()).toBe("");
		expect(lambda.invokeEvent).toHaveBeenCalledWith({ job: "media-sync" });
	});

	it("answers 500 without naming the function when it can't be reached", async () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		lambda.invokeEvent.mockRejectedValue(
			new Error("Lambda 関数の非同期呼び出しに失敗しました: media-sync"),
		);

		const response = await createApp().request(`${uiOrigin}/api/sync`, {
			method: "POST",
			headers: { origin: uiOrigin },
		});

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			message: "リクエストの処理に失敗しました",
		});
		expect(logged).toHaveBeenCalled();
		logged.mockRestore();
	});
});

describe("readSyncStatus", () => {
	it("returns the latest run and reports nothing in flight", async () => {
		const response = await createApp().request(`${uiOrigin}/api/sync/status`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			latest: {
				id: runId,
				startedAt: startedAt.toISOString(),
				finishedAt: "2026-02-03T04:10:06.000Z",
				scannedCount: 10,
				insertedCount: 2,
				updatedCount: 1,
				deletedCount: 0,
				error: null,
			},
			running: null,
		});
	});

	it("returns both as null before the sync has ever run", async () => {
		syncRunRepository.findLatest.mockResolvedValue(undefined);

		const response = await createApp().request(`${uiOrigin}/api/sync/status`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ latest: null, running: null });
	});
});
