import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startSyncOperation } from "./start-sync-operation.js";

const fetchMock = vi.fn();

beforeEach(() => {
	process.env.MEDIA_SYNC_ENDPOINT_URL = "https://endpoint.test/media/sync";
	process.env.MEDIA_SYNC_TOKEN = "sync-token";
	fetchMock.mockReset();
	fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("startSyncOperation", () => {
	it("asks the configured endpoint to start a run, carrying the token", async () => {
		const result = await startSyncOperation();

		expect(fetchMock).toHaveBeenCalledWith(
			"https://endpoint.test/media/sync",
			expect.objectContaining({
				method: "POST",
				headers: { Authorization: "Bearer sync-token" },
			}),
		);
		expect(result.kind).toBe("OK");
	});

	it("fails before sending anything when the endpoint or the token isn't configured", async () => {
		process.env.MEDIA_SYNC_ENDPOINT_URL = "";

		await expect(startSyncOperation()).rejects.toThrow(
			"MEDIA_SYNC_ENDPOINT_URL が設定されていません。",
		);

		process.env.MEDIA_SYNC_ENDPOINT_URL = "https://endpoint.test/media/sync";
		process.env.MEDIA_SYNC_TOKEN = "";

		await expect(startSyncOperation()).rejects.toThrow(
			"MEDIA_SYNC_TOKEN が設定されていません。",
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("fails with the status alone when the endpoint refuses the request", async () => {
		fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

		await expect(startSyncOperation()).rejects.toThrow(
			"同期の起動依頼が拒否されました: 401",
		);
	});
});
