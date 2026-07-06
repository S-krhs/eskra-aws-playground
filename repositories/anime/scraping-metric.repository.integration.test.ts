// TODO: 別タスクで testcontainers の PostgreSQL に移行する。
//       それまでは TEST_DATABASE_URL(ローカル用 Neon branch)が設定されている場合のみ実行される。
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getPrismaClient } from "../db/client.js";
import { scrapingMetricRepository } from "./scraping-metric.repository.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDataSourceId = `integration-test-${Date.now()}`;

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
			const scrapedAt = new Date();

			await scrapingMetricRepository.saveScrapingResult({
				dataSourceId: testDataSourceId,
				scrapedAt,
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
			expect(rows[0]?.scrapedAt.getTime()).toBe(scrapedAt.getTime());
			expect(rows[0]?.id).toBeGreaterThan(0n);
		});

		it("label が空文字列の場合は validation で弾かれ insert されない", async () => {
			await expect(
				scrapingMetricRepository.saveScrapingResult({
					dataSourceId: testDataSourceId,
					scrapedAt: new Date(),
					metrics: [{ label: "", value: 1 }],
				}),
			).rejects.toThrow();

			const prisma = getPrismaClient();
			const rows = await prisma.scrapingMetric.findMany({
				where: { dataSourceId: testDataSourceId, label: "" },
			});
			expect(rows).toHaveLength(0);
		});
	},
);
