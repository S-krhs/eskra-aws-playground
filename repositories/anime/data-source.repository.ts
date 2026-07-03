// やること: repository からアニメ指標スクレイピング定義を読み込む
// やらないこと: スクレイピング実行、parser 入力変換、外部通知を行う
import { animeMetricDataSources } from "./data.js";
import type { AnimeMetricDataSource } from "./types.js";

export const dataSourceRepository = {
	findMany: (): AnimeMetricDataSource[] => [...animeMetricDataSources],

	findUnique: (id: string): AnimeMetricDataSource | null => {
		const dataSource =
			animeMetricDataSources.find((ds) => ds.id === id) ?? null;
		return dataSource;
	},
};
