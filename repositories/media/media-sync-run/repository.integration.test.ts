// TODO: move to a testcontainers PostgreSQL in a separate task.
//       Until then this only runs when TEST_DATABASE_URL (a local Neon branch) is set.
import { randomUUID } from "node:crypto";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";

import { getPrismaClient } from "../../db/client.js";
import { mediaSyncRunRepository } from "./repository.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// A unique id per run, so parallel runs and a shared branch never fight over the same rows
const ids = [randomUUID(), randomUUID()];
const [runId, laterRunId] = ids as [string, string];

// findLatest / findRunning scan every row, so these sit after any real data to keep the test rows newest
const startedAt = new Date("2099-09-07T00:00:00.000Z");
const progress = {
	scannedCount: 120,
	insertedCount: 3,
	updatedCount: 1,
	deletedCount: 0,
};

const deleteTestRows = async (): Promise<void> => {
	await getPrismaClient().mediaSyncRun.deleteMany({
		where: { id: { in: ids } },
	});
};

describe.skipIf(!testDatabaseUrl)(
	"mediaSyncRunRepository (integration)",
	() => {
		beforeAll(() => {
			process.env.DATABASE_URL = testDatabaseUrl;
		});

		beforeEach(deleteTestRows);
		afterEach(deleteTestRows);

		afterAll(async () => {
			await deleteTestRows();
			await getPrismaClient().$disconnect();
		});

		it("creates a started run with every count at 0", async () => {
			const run = await mediaSyncRunRepository.start(runId, startedAt);

			expect(run).toEqual({
				id: runId,
				startedAt,
				finishedAt: undefined,
				scannedCount: 0,
				insertedCount: 0,
				updatedCount: 0,
				deletedCount: 0,
				error: undefined,
			});
		});

		it("writes counts back while the run is in flight", async () => {
			await mediaSyncRunRepository.start(runId, startedAt);
			await mediaSyncRunRepository.updateProgress({ id: runId, ...progress });

			expect(await mediaSyncRunRepository.findLatest()).toMatchObject(progress);
		});

		it("reports only an unfinished run as running", async () => {
			await mediaSyncRunRepository.start(runId, startedAt);
			expect((await mediaSyncRunRepository.findRunning())?.id).toBe(runId);

			await mediaSyncRunRepository.finish({
				id: runId,
				...progress,
				finishedAt: new Date("2099-09-07T00:05:00.000Z"),
			});
			expect(await mediaSyncRunRepository.findRunning()).toBeUndefined();
		});

		it("keeps the error on a failed run", async () => {
			await mediaSyncRunRepository.start(runId, startedAt);
			await mediaSyncRunRepository.finish({
				id: runId,
				...progress,
				finishedAt: new Date("2099-09-07T00:05:00.000Z"),
				error: "R2 の一覧取得に失敗しました",
			});

			expect(await mediaSyncRunRepository.findLatest()).toMatchObject({
				error: "R2 の一覧取得に失敗しました",
			});
		});

		// A later run has to be able to tell that an earlier one is already going
		it("returns the older one when two runs are in flight", async () => {
			await mediaSyncRunRepository.start(runId, startedAt);
			await mediaSyncRunRepository.start(
				laterRunId,
				new Date("2099-09-07T02:00:00.000Z"),
			);

			expect((await mediaSyncRunRepository.findRunning())?.id).toBe(runId);
		});

		// startedAt is taken before the row is inserted, so two runs can end up in the opposite order.
		// Unless the row inserted first wins, both runs decide they are oldest and run twice
		it("returns the run inserted first even when startedAt says otherwise", async () => {
			await mediaSyncRunRepository.start(
				runId,
				new Date("2099-09-07T02:00:00.000Z"),
			);
			await mediaSyncRunRepository.start(laterRunId, startedAt);

			expect((await mediaSyncRunRepository.findRunning())?.id).toBe(runId);
		});

		it("reports the most recently started run as the latest", async () => {
			await mediaSyncRunRepository.start(runId, startedAt);
			await mediaSyncRunRepository.start(
				laterRunId,
				new Date("2099-09-07T02:00:00.000Z"),
			);

			expect((await mediaSyncRunRepository.findLatest())?.id).toBe(laterRunId);
		});
	},
);
