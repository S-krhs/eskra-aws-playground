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

import { getPrismaClient } from "../../client/prisma.js";
import { mediaSyncRunRepository } from "./repository.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// A unique id per run, so parallel runs and a shared branch never fight over the same rows
const ids = [randomUUID(), randomUUID()];
const [runId, laterRunId] = ids as [string, string];

// findLatest / findUnfinished scan every row, so these sit after any real data to keep the test rows newest
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
			const run = await mediaSyncRunRepository.insert(runId, startedAt);

			expect(run).toEqual({
				id: runId,
				startedAt,
				finishedAt: null,
				scannedCount: 0,
				insertedCount: 0,
				updatedCount: 0,
				deletedCount: 0,
				error: null,
			});
		});

		it("writes counts back while the run is in flight", async () => {
			await mediaSyncRunRepository.insert(runId, startedAt);
			await mediaSyncRunRepository.updateCounts({ id: runId, ...progress });

			expect(await mediaSyncRunRepository.findLatest()).toMatchObject(progress);
		});

		it("reports only an unfinished run as running", async () => {
			await mediaSyncRunRepository.insert(runId, startedAt);
			expect((await mediaSyncRunRepository.findUnfinished())?.id).toBe(runId);

			await mediaSyncRunRepository.updateFinished({
				id: runId,
				...progress,
				finishedAt: new Date("2099-09-07T00:05:00.000Z"),
			});
			expect(await mediaSyncRunRepository.findUnfinished()).toBeUndefined();
		});

		it("keeps the error on a failed run", async () => {
			await mediaSyncRunRepository.insert(runId, startedAt);
			await mediaSyncRunRepository.updateFinished({
				id: runId,
				...progress,
				finishedAt: new Date("2099-09-07T00:05:00.000Z"),
				error: "R2 の一覧取得に失敗しました",
			});

			expect(await mediaSyncRunRepository.findLatest()).toMatchObject({
				error: "R2 の一覧取得に失敗しました",
			});
		});

		// The single slot is what stops two syncs walking R2 at once, so a second one takes no row at all
		it("refuses a run while another is unfinished, leaving the first holding the slot", async () => {
			await mediaSyncRunRepository.insert(runId, startedAt);

			expect(
				await mediaSyncRunRepository.insert(
					laterRunId,
					new Date("2099-09-07T02:00:00.000Z"),
				),
			).toBeUndefined();
			expect((await mediaSyncRunRepository.findUnfinished())?.id).toBe(runId);
		});

		it("reports the most recently started run as the latest", async () => {
			await mediaSyncRunRepository.insert(runId, startedAt);
			await mediaSyncRunRepository.updateFinished({
				id: runId,
				...progress,
				finishedAt: new Date("2099-09-07T00:05:00.000Z"),
			});
			await mediaSyncRunRepository.insert(
				laterRunId,
				new Date("2099-09-07T02:00:00.000Z"),
			);

			expect((await mediaSyncRunRepository.findLatest())?.id).toBe(laterRunId);
		});
	},
);
