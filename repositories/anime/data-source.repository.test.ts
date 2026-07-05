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
