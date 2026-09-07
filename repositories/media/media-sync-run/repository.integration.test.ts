// TODO: 別タスクで testcontainers の PostgreSQL に移行する。
//       それまでは TEST_DATABASE_URL(ローカル用 Neon branch)が設定されている場合のみ実行される。
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

// 並行実行や共有 branch で行を取り合わないよう、実行ごとに一意な id を使う
const ids = [randomUUID(), randomUUID()];
const [runId, laterRunId] = ids as [string, string];

// findLatest / findRunning は全件から探すため、実データより後ろの日時にして
// テスト行が必ず最新になるようにする
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

		it("開始した実行を件数 0 で作る", async () => {
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

		it("実行中の件数を書き戻す", async () => {
			await mediaSyncRunRepository.start(runId, startedAt);
			await mediaSyncRunRepository.updateProgress({ id: runId, ...progress });

			expect(await mediaSyncRunRepository.findLatest()).toMatchObject(progress);
		});

		it("終了していない実行だけを実行中として返す", async () => {
			await mediaSyncRunRepository.start(runId, startedAt);
			expect((await mediaSyncRunRepository.findRunning())?.id).toBe(runId);

			await mediaSyncRunRepository.finish({
				id: runId,
				...progress,
				finishedAt: new Date("2099-09-07T00:05:00.000Z"),
			});
			expect(await mediaSyncRunRepository.findRunning()).toBeUndefined();
		});

		it("失敗した実行に error を残す", async () => {
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

		it("開始が新しい実行を最新として返す", async () => {
			await mediaSyncRunRepository.start(runId, startedAt);
			await mediaSyncRunRepository.start(
				laterRunId,
				new Date("2099-09-07T02:00:00.000Z"),
			);

			expect((await mediaSyncRunRepository.findLatest())?.id).toBe(laterRunId);
		});
	},
);
