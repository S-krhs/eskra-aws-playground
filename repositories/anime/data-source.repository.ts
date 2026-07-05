// In scope: repository からアニメ指標スクレイピング定義を読み込む
// Out of scope: スクレイピング実行、parser 入力変換、外部通知を行う
import { animeMetricDataSources } from "./data.js";
import type { AnimeMetricDataSource } from "./types.js";

export const dataSourceRepository = {
	findMany: (): AnimeMetricDataSource[] => {
		return [...animeMetricDataSources];
	},

	findManyByScheduleHour: (scheduleHour: number): AnimeMetricDataSource[] => {
		return animeMetricDataSources.filter((dataSource) => {
			return dataSource.scheduleHour === scheduleHour;
		});
	},

	findUnique: (id: string): AnimeMetricDataSource | null => {
		const dataSource =
			animeMetricDataSources.find((ds) => {
				return ds.id === id;
			}) ?? null;
		return dataSource;
	},
};
