// TODO: move to a testcontainers PostgreSQL in a separate task.
//       Until then this only runs when TEST_DATABASE_URL (a local Neon branch) is set.
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

		it("inserts a scrape as one row per metric and reads it back", async () => {
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

		it("rejects an empty label at validation and inserts nothing", async () => {
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

		it("returns only the dates holding a metric, oldest first", async () => {
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

		it("pages through a date's metrics ordered by id", async () => {
			// Collect only this run's dataSourceId, so leftover rows from another run on the same date don't break it
			const collected: ScrapingMetricRecord[] = [];
			let afterId: string | undefined;

			while (collected.length < 2) {
				const page = await scrapingMetricRepository.findManyByScrapedDate({
					scrapedDate: testScrapedDate,
					afterId,
					limit: 1,
				});
				// Running out of rows fails here, so a stalled page cursor can't loop forever
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

		it("errors on a scraped date not in YYYY-MM-DD form", async () => {
			for (const scrapedDate of ["2026-08", "2026", "2026-8-1", "2026/08/01"]) {
				await expect(
					scrapingMetricRepository.findManyByScrapedDate({
						scrapedDate,
						limit: 1,
					}),
				).rejects.toThrow("YYYY-MM-DD");
			}
		});

		it("errors on a nonexistent date instead of rolling it into another day", async () => {
			// Date rolls 2026-02-30 into 2026-03-02, so check that another day is never read silently
			for (const scrapedDate of ["2026-02-30", "2026-13-99"]) {
				await expect(
					scrapingMetricRepository.findManyByScrapedDate({
						scrapedDate,
						limit: 1,
					}),
				).rejects.toThrow("存在しない取得日");
			}
		});

		it("errors on an afterId that is not id-shaped", async () => {
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
