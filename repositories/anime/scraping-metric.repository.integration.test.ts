// TODO: 別タスクで testcontainers の PostgreSQL に移行する。
//       それまでは TEST_DATABASE_URL(ローカル用 Neon branch)が設定されている場合のみ実行される。
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getPrismaClient } from "../db/client.js";
import { scrapingMetricRepository } from "./scraping-metric.repository.js";

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
			const firstPage = await scrapingMetricRepository.findManyByScrapedDate({
				scrapedDate: testScrapedDate,
				limit: 1,
			});
			expect(firstPage).toHaveLength(1);
			expect(firstPage[0]).toMatchObject({
				dataSourceId: testDataSourceId,
				label: "作品A",
				value: 1,
				scrapedDate: testScrapedDate,
			});
			expect(firstPage[0]?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);

			const secondPage = await scrapingMetricRepository.findManyByScrapedDate({
				scrapedDate: testScrapedDate,
				afterId: firstPage[0]?.id,
				limit: 10,
			});
			expect(
				secondPage.map((record) => {
					return record.label;
				}),
			).toEqual(["作品B"]);
		});

		it("取得日が YYYY-MM-DD 形式でない場合はエラーにする", async () => {
			await expect(
				scrapingMetricRepository.findManyByScrapedDate({
					scrapedDate: "2026-13-99",
					limit: 1,
				}),
			).rejects.toThrow("YYYY-MM-DD");
		});
	},
);
