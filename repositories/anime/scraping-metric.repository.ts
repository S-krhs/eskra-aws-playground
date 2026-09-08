// In scope: persisting anime-metric scraping results (row validation before insert included) and reading them back by scraped date
// Out of scope: running the scrape, sending notifications, owning data source definitions, external storage
import { getPrismaClient } from "../client/prisma.js";
import { ScrapingMetricCreateManyInputObjectZodSchema } from "../generated/zod/schemas/objects/ScrapingMetricCreateManyInput.schema.js";

export interface ScrapingResultMetric {
	label: string;
	value: number;
}

export interface SaveScrapingResultInput {
	dataSourceId: string;
	/** Scraped date in JST (YYYY-MM-DD). */
	scrapedDate: string;
	metrics: ScrapingResultMetric[];
}

export interface ScrapingMetricRecord {
	id: string;
	dataSourceId: string;
	label: string;
	value: number;
	/** Scraped date in JST (YYYY-MM-DD). */
	scrapedDate: string;
	/** Time the row was stored (ISO 8601). */
	createdAt: string;
}

export interface FindScrapingMetricsInput {
	/** Scraped date in JST (YYYY-MM-DD). */
	scrapedDate: string;
	/** Last id of the previous page — only rows after it are returned. */
	afterId?: string;
	limit: number;
}

/** The range is inclusive on both ends. */
export interface FindScrapedDatesInput {
	startDate: string;
	endDate: string;
}

const dateStringPattern = /^\d{4}-\d{2}-\d{2}$/;
const idPattern = /^\d+$/;

// A DATE column comes back as a Date at UTC 00:00, so the date part can be sliced off directly
const toDateString = (value: Date): string => {
	return value.toISOString().slice(0, 10);
};

const toDateValue = (scrapedDate: string): Date => {
	if (!dateStringPattern.test(scrapedDate)) {
		throw new Error(`取得日が YYYY-MM-DD 形式ではありません: ${scrapedDate}`);
	}

	// Date rolls a nonexistent day like 2026-02-30 into the next month, so round-trip it and compare
	const value = new Date(`${scrapedDate}T00:00:00.000Z`);
	if (Number.isNaN(value.getTime()) || toDateString(value) !== scrapedDate) {
		throw new Error(`存在しない取得日です: ${scrapedDate}`);
	}

	return value;
};

const toIdValue = (afterId: string): bigint => {
	if (!idPattern.test(afterId)) {
		throw new Error(`afterId が id の形式ではありません: ${afterId}`);
	}

	return BigInt(afterId);
};

export const scrapingMetricRepository = {
	/** Appends one scrape's results as one row per metric; a validation failure throws without inserting anything. */
	saveScrapingResult: async (input: SaveScrapingResultInput): Promise<void> => {
		const rows = input.metrics.map((metric) => {
			return ScrapingMetricCreateManyInputObjectZodSchema.parse({
				dataSourceId: input.dataSourceId,
				label: metric.label,
				value: metric.value,
				scrapedDate: input.scrapedDate,
			});
		});

		const prisma = getPrismaClient();
		await prisma.scrapingMetric.createMany({ data: rows });
	},

	/** Returns the dates in range that hold at least one metric, oldest first. */
	findScrapedDates: async (input: FindScrapedDatesInput): Promise<string[]> => {
		const startDate = toDateValue(input.startDate);
		const endDate = toDateValue(input.endDate);

		const prisma = getPrismaClient();
		const groups = await prisma.scrapingMetric.groupBy({
			by: ["scrapedDate"],
			where: {
				scrapedDate: {
					gte: startDate,
					lte: endDate,
				},
			},
			orderBy: { scrapedDate: "asc" },
		});

		return groups.map((group) => {
			return toDateString(group.scrapedDate);
		});
	},

	/**
	 * Returns one page of a date's metrics, ordered by id. Pass the last returned id as `afterId`
	 * for the next page, so the whole day never has to sit in memory at once.
	 */
	findManyByScrapedDate: async (
		input: FindScrapingMetricsInput,
	): Promise<ScrapingMetricRecord[]> => {
		const scrapedDate = toDateValue(input.scrapedDate);
		const afterId = input.afterId ? toIdValue(input.afterId) : undefined;

		const prisma = getPrismaClient();
		const rows = await prisma.scrapingMetric.findMany({
			where: {
				scrapedDate,
				...(afterId === undefined ? {} : { id: { gt: afterId } }),
			},
			orderBy: { id: "asc" },
			take: input.limit,
		});

		return rows.map((row) => {
			return {
				id: row.id.toString(),
				dataSourceId: row.dataSourceId,
				label: row.label,
				value: row.value,
				scrapedDate: toDateString(row.scrapedDate),
				createdAt: row.createdAt.toISOString(),
			};
		});
	},
};
