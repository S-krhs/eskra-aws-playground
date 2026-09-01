// TODO: 別タスクで testcontainers の PostgreSQL に移行する。
//       それまでは TEST_DATABASE_URL(ローカル用 Neon branch)が設定されている場合のみ実行される。
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getPrismaClient } from "../db/client.js";
import {
	type ScrapingMetricRecord,
	scrapingMetricRepository,
} from "./scraping-metric.repository.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDataSourceId = `integration-test-${Date.now()}`;
const testScrapedDate = "2026-07-06";
const testNextScrapedDate = "2026-07-07";

describe.skipIf(!testDatabaseUrl)(
	"scrapingMetricRepository (integration)",
	() => {
		beforeAll(() => {
			process.env.DATABASE_URL = testDatabaseUrl;
		});

		afterAll(async () => {
			const prisma = getPrismaClient();
			await prisma.scrapingMetric.deleteMany({
				where: { dataSourceId: testDataSourceId },
			});
			await prisma.$disconnect();
		});

		it("スクレイピング結果を 1 metric = 1 行で insert して読み戻せる", async () => {
			await scrapingMetricRepository.saveScrapingResult({
				dataSourceId: testDataSourceId,
				scrapedDate: testScrapedDate,
				metrics: [
					{ label: "作品A", value: 1 },
					{ label: "作品B", value: 2.5 },
				],
			});

			const prisma = getPrismaClient();
			const rows = await prisma.scrapingMetric.findMany({
				where: { dataSourceId: testDataSourceId },
				orderBy: { label: "asc" },
			});

			expect(rows).toHaveLength(2);
			expect(rows[0]).toMatchObject({
				dataSourceId: testDataSourceId,
				label: "作品A",
				value: 1,
			});
			expect(rows[1]).toMatchObject({ label: "作品B", value: 2.5 });
			expect(rows[0]?.scrapedDate.toISOString().slice(0, 10)).toBe(
				testScrapedDate,
			);
			expect(rows[0]?.id).toBeGreaterThan(0n);
		});

		it("label が空文字列の場合は validation で弾かれ insert されない", async () => {
			await expect(
				scrapingMetricRepository.saveScrapingResult({
					dataSourceId: testDataSourceId,
					scrapedDate: testScrapedDate,
					metrics: [{ label: "", value: 1 }],
				}),
			).rejects.toThrow();

			const prisma = getPrismaClient();
			const rows = await prisma.scrapingMetric.findMany({
				where: { dataSourceId: testDataSourceId, label: "" },
			});
			expect(rows).toHaveLength(0);
		});

		it("metric がある取得日だけを古い順に返す", async () => {
			await scrapingMetricRepository.saveScrapingResult({
				dataSourceId: testDataSourceId,
				scrapedDate: testNextScrapedDate,
				metrics: [{ label: "作品C", value: 3 }],
			});

			const scrapedDates = await scrapingMetricRepository.findScrapedDates({
				startDate: testScrapedDate,
				endDate: testNextScrapedDate,
			});

			expect(scrapedDates).toEqual(
				expect.arrayContaining([testScrapedDate, testNextScrapedDate]),
			);
			expect([...scrapedDates].sort()).toEqual(scrapedDates);
		});

		it("取得日の metric を id 昇順で 1 ページずつ読み出せる", async () => {
			// 同じ取得日に他 run の行が残っていても成立するよう、自分の dataSourceId の行だけを集める
			const collected: ScrapingMetricRecord[] = [];
			let afterId: string | undefined;

			while (collected.length < 2) {
				const page = await scrapingMetricRepository.findManyByScrapedDate({
					scrapedDate: testScrapedDate,
					afterId,
					limit: 1,
				});
				// 行が尽きたらここで落ちるため、ページ送りが進まなくても無限には回らない
				expect(page).toHaveLength(1);

				const record = page[0];
				if (record?.dataSourceId === testDataSourceId) {
					collected.push(record);
				}
				afterId = record?.id;
			}

			expect(collected[0]).toMatchObject({
				dataSourceId: testDataSourceId,
				label: "作品A",
				value: 1,
				scrapedDate: testScrapedDate,
			});
			expect(collected[0]?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
			expect(collected[1]).toMatchObject({ label: "作品B", value: 2.5 });
		});

		it("YYYY-MM-DD 形式でない取得日はエラーにする", async () => {
			for (const scrapedDate of ["2026-08", "2026", "2026-8-1", "2026/08/01"]) {
				await expect(
					scrapingMetricRepository.findManyByScrapedDate({
						scrapedDate,
						limit: 1,
					}),
				).rejects.toThrow("YYYY-MM-DD");
			}
		});

		it("存在しない取得日は別の日へ繰り上げずエラーにする", async () => {
			// 2026-02-30 は Date が 2026-03-02 へ繰り上げるため、黙って別の日を読まないことを確かめる
			for (const scrapedDate of ["2026-02-30", "2026-13-99"]) {
				await expect(
					scrapingMetricRepository.findManyByScrapedDate({
						scrapedDate,
						limit: 1,
					}),
				).rejects.toThrow("存在しない取得日");
			}
		});

		it("id の形式でない afterId はエラーにする", async () => {
			await expect(
				scrapingMetricRepository.findManyByScrapedDate({
					scrapedDate: testScrapedDate,
					afterId: "abc",
					limit: 1,
				}),
			).rejects.toThrow("afterId");
		});
	},
);
