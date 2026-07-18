import { afterEach, describe, expect, it, vi } from "vitest";

describe("warmupDatabaseConnection", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("DATABASE_URL 未設定でも同期 throw せず rejection として返す", async () => {
		vi.stubEnv("DATABASE_URL", "");
		vi.resetModules();
		const { warmupDatabaseConnection } = await import("./db-warmup.js");

		await expect(warmupDatabaseConnection()).rejects.toThrow(
			"DATABASE_URL が設定されていません",
		);
	});
});
