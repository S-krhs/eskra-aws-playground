import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const fetchMock = vi.fn();

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
	process.env.MEDIA_SYNC_ENDPOINT_URL = "https://endpoint.test/media/sync";
	process.env.MEDIA_SYNC_TOKEN = "sync-token";
	syncRunRepository.findLatest.mockReset();
	syncRunRepository.findLatest.mockResolvedValue(finishedRun);
	syncRunRepository.findUnfinished.mockReset();
	syncRunRepository.findUnfinished.mockResolvedValue(undefined);
	fetchMock.mockReset();
	fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("startSync", () => {
	it("asks the sync endpoint to start a run and answers with an empty acceptance", async () => {
		const response = await createApp().request(`${uiOrigin}/api/sync`, {
			method: "POST",
			headers: { origin: uiOrigin },
		});

		expect(response.status).toBe(202);
		expect(await response.text()).toBe("");
		expect(fetchMock).toHaveBeenCalledWith(
			"https://endpoint.test/media/sync",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("answers 500 without repeating the endpoint's own refusal when it can't be reached", async () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

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
