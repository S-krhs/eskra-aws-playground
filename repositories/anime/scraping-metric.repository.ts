// In scope: アニメ指標スクレイピング結果の永続化(insert 前の row validation を含む)
// Out of scope: スクレイピング実行、通知送信、data source 定義の管理
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
	scrapedAt: Date;
	metrics: ScrapingResultMetric[];
}

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
				scrapedAt: input.scrapedAt,
			});
		});

		const prisma = getPrismaClient();
		await prisma.scrapingMetric.createMany({ data: rows });
	},
};
