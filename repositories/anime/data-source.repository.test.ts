import { describe, expect, it } from "vitest";

import { animeMetricDataSources } from "./data.js";
import { dataSourceRepository } from "./data-source.repository.js";

describe("dataSourceRepository", () => {
	it("lists every defined data source", () => {
		expect(dataSourceRepository.findMany()).toEqual(animeMetricDataSources);
	});

	it("returns the data source matching an id", () => {
		const dataSource = animeMetricDataSources.find((ds) => {
			return ds.id === "danime-rank";
		});

		expect(dataSourceRepository.findUnique("danime-rank")).toEqual(dataSource);
	});

	it("returns null when no data source matches the id", () => {
		expect(dataSourceRepository.findUnique("unknown")).toBeNull();
	});

	it("returns only the data sources on a given schedule hour", () => {
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

	it("hands back a defensive copy of the list", () => {
		const dataSources = dataSourceRepository.findMany();
		dataSources.pop();

		expect(dataSourceRepository.findMany()).toHaveLength(
			animeMetricDataSources.length,
		);
	});

	it("has no duplicate data source id", () => {
		const ids = animeMetricDataSources.map((dataSource) => {
			return dataSource.id;
		});

		expect(new Set(ids).size).toBe(ids.length);
	});
});
