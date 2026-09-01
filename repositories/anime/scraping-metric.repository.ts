// In scope: アニメ指標スクレイピング結果の永続化(insert 前の row validation を含む)と取得日単位の読み出し
// Out of scope: スクレイピング実行、通知送信、data source 定義の管理、外部ストレージへの連携
import { getPrismaClient } from "../db/client.js";
import { ScrapingMetricCreateManyInputObjectZodSchema } from "../generated/zod/schemas/objects/ScrapingMetricCreateManyInput.schema.js";

/** 1 回のスクレイピングで得た metric 1 件。 */
export interface ScrapingResultMetric {
	label: string;
	value: number;
}

/** スクレイピング結果の保存入力。 */
export interface SaveScrapingResultInput {
	dataSourceId: string;
	/** JST 基準の取得日(YYYY-MM-DD)。 */
	scrapedDate: string;
	metrics: ScrapingResultMetric[];
}

/** 読み出した metric 1 行。 */
export interface ScrapingMetricRecord {
	id: string;
	dataSourceId: string;
	label: string;
	value: number;
	/** JST 基準の取得日(YYYY-MM-DD)。 */
	scrapedDate: string;
	/** 保存時刻(ISO 8601)。 */
	createdAt: string;
}

/** 取得日を指定した metric の読み出し入力。 */
export interface FindScrapingMetricsInput {
	/** JST 基準の取得日(YYYY-MM-DD)。 */
	scrapedDate: string;
	/** 前ページ末尾の id。指定した場合、この id より後の行だけを返す。 */
	afterId?: string;
	/** 1 ページで返す最大行数。 */
	limit: number;
}

/** metric が存在する取得日の検索入力。範囲は両端を含む。 */
export interface FindScrapedDatesInput {
	startDate: string;
	endDate: string;
}

const dateStringPattern = /^\d{4}-\d{2}-\d{2}$/;
const idPattern = /^\d+$/;

// DATE 列は UTC 00:00 の Date として返るため、日付部分をそのまま取り出せる
const toDateString = (value: Date): string => {
	return value.toISOString().slice(0, 10);
};

const toDateValue = (scrapedDate: string): Date => {
	if (!dateStringPattern.test(scrapedDate)) {
		throw new Error(`取得日が YYYY-MM-DD 形式ではありません: ${scrapedDate}`);
	}

	// Date は 2026-02-30 のような存在しない日を翌月へ繰り上げるため、往復させて一致を確かめる
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
	/**
	 * 1 回のスクレイピング結果を 1 metric = 1 行で追記する。
	 * validation に失敗した場合は insert せず throw する。
	 */
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

	/** 指定範囲のうち metric が 1 件以上ある取得日を、古い順に返す。 */
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
	 * 取得日の metric を id の昇順で 1 ページ分返す。
	 * 全件をメモリに載せずに読み出せるよう、続きは戻り値末尾の id を `afterId` に渡して取得する。
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
