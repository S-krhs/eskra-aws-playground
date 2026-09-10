import { beforeEach, describe, expect, it, vi } from "vitest";
import { readSyncStatusOperation } from "./read-sync-status-operation.js";

const syncRunRepository = vi.hoisted(() => {
	return { findLatest: vi.fn(), findUnfinished: vi.fn() };
});

vi.mock(
	"@eskra-aws-playground/repositories/media/media-sync-run/repository.js",
	() => {
		return { mediaSyncRunRepository: syncRunRepository };
	},
);

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
	syncRunRepository.findLatest.mockReset();
	syncRunRepository.findLatest.mockResolvedValue(undefined);
	syncRunRepository.findUnfinished.mockReset();
	syncRunRepository.findUnfinished.mockResolvedValue(undefined);
});

describe("readSyncStatusOperation", () => {
	it("reports both as null before the sync has ever run", async () => {
		const result = await readSyncStatusOperation();

		expect(result).toEqual({
			kind: "OK",
			data: { latest: null, running: null },
		});
	});

	it("shapes the finished run into the timestamps and counts the screen shows", async () => {
		syncRunRepository.findLatest.mockResolvedValue(finishedRun);

		const result = await readSyncStatusOperation();

		expect(result.data.latest).toEqual({
			id: runId,
			startedAt: startedAt.toISOString(),
			finishedAt: "2026-02-03T04:10:06.000Z",
			scannedCount: 10,
			insertedCount: 2,
			updatedCount: 1,
			deletedCount: 0,
			error: null,
		});
	});

	it("reports a run still in flight with no finish time", async () => {
		syncRunRepository.findUnfinished.mockResolvedValue({
			...finishedRun,
			finishedAt: null,
			scannedCount: 3,
		});

		const result = await readSyncStatusOperation();

		expect(result.data.running?.finishedAt).toBeNull();
		expect(result.data.running?.scannedCount).toBe(3);
	});

	it("replaces the recorded exception message with a fixed one", async () => {
		syncRunRepository.findLatest.mockResolvedValue({
			...finishedRun,
			error:
				"NoSuchBucket: https://account.r2.cloudflarestorage.com/media-bucket",
		});

		const result = await readSyncStatusOperation();

		expect(result.data.latest?.error).toBe(
			"同期に失敗しました。実行ログを確認してください。",
		);
	});

	it("leaves out a column the run record gained that the screen was never given", async () => {
		syncRunRepository.findLatest.mockResolvedValue({
			...finishedRun,
			connectionUrl: "postgresql://user:password@db.internal:5432",
		});

		const result = await readSyncStatusOperation();

		expect(result.data.latest).not.toHaveProperty("connectionUrl");
	});
});
