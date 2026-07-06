import { describe, expect, it } from "vitest";

import { animeMetricDataSources } from "./data.js";
import { dataSourceRepository } from "./data-source.repository.js";

describe("dataSourceRepository", () => {
	it("定義済み data source を一覧で返す", () => {
		expect(dataSourceRepository.findMany()).toEqual(animeMetricDataSources);
	});

	it("id に一致する data source を返す", () => {
		const dataSource = animeMetricDataSources.find((ds) => {
			return ds.id === "danime-rank";
		});

		expect(dataSourceRepository.findUnique("danime-rank")).toEqual(dataSource);
	});

	it("id に一致する data source がない場合は null を返す", () => {
		expect(dataSourceRepository.findUnique("unknown")).toBeNull();
	});

	it("schedule hour に一致する data source だけを返す", () => {
		expect(
			dataSourceRepository.findManyByScheduleHour(9).map((dataSource) => {
				return dataSource.id;
			}),
		).toEqual(["netflix-jp-tv-rank", "netflix-jp-movie-rank"]);

		expect(
			dataSourceRepository.findManyByScheduleHour(23).map((dataSource) => {
				return dataSource.id;
			}),
		).toEqual([
			"bilibili-rank",
			"bilibili-view",
			"bilibili-danmaku",
			"bilibili-follow",
			"bilibili-series-follow",
			"danime-rank",
			"danime-users",
			"danime-favs",
			"danime-total-number",
			"my-anime-list-members",
			"my-anime-list-score",
		]);
	});

	it("一覧は防御的コピーとして返す", () => {
		const dataSources = dataSourceRepository.findMany();
		dataSources.pop();

		expect(dataSourceRepository.findMany()).toHaveLength(
			animeMetricDataSources.length,
		);
	});

	it("data source id は重複しない", () => {
		const ids = animeMetricDataSources.map((dataSource) => {
			return dataSource.id;
		});

		expect(new Set(ids).size).toBe(ids.length);
	});
});
