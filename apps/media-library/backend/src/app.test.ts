import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

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

beforeEach(() => {
	process.env.MEDIA_SYNC_ENDPOINT_URL = "https://endpoint.test/media/sync";
	process.env.MEDIA_SYNC_TOKEN = "sync-token";
	syncRunRepository.findLatest.mockReset();
	syncRunRepository.findLatest.mockResolvedValue(undefined);
	syncRunRepository.findUnfinished.mockReset();
	syncRunRepository.findUnfinished.mockResolvedValue(undefined);
	fetchMock.mockReset();
	fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("createApp", () => {
	it("answers a path under /api that matched no route with a failure the caller can read", async () => {
		const response = await createApp().request(`${uiOrigin}/api/unknown`);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ message: "その API はありません" });
	});

	it("answers a failing route with a fixed message and keeps the exception in the log", async () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		syncRunRepository.findLatest.mockRejectedValue(
			new Error("postgresql://user:password@db.internal:5432 に接続できません"),
		);

		const response = await createApp().request(`${uiOrigin}/api/sync/status`);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			message: "リクエストの処理に失敗しました",
		});
		expect(logged).toHaveBeenCalled();
	});

	it("turns away a request that arrived under another host name", async () => {
		const response = await createApp().request(
			"http://rebound.example/api/media",
		);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({
			message: "このホスト名宛てのリクエストは受け付けません",
		});
	});

	it("turns away a state-changing request sent from another origin", async () => {
		const response = await createApp().request(`${uiOrigin}/api/sync`, {
			method: "POST",
			headers: { origin: "http://attacker.example" },
		});

		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("turns away a state-changing request that carries no origin at all", async () => {
		const response = await createApp().request(`${uiOrigin}/api/sync`, {
			method: "POST",
		});

		expect(response.status).toBe(403);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("lets the UI's own origin start a sync", async () => {
		const response = await createApp().request(`${uiOrigin}/api/sync`, {
			method: "POST",
			headers: { origin: uiOrigin },
		});

		expect(response.status).toBe(202);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("lets a read through without an origin, since it changes nothing", async () => {
		const response = await createApp().request(`${uiOrigin}/api/sync/status`);

		expect(response.status).toBe(200);
	});
});
