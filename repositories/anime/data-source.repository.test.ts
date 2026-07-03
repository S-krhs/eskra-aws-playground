import { describe, expect, it } from "vitest";

import { animeMetricDataSources } from "./data.js";
import { dataSourceRepository } from "./data-source.repository.js";

describe("dataSourceRepository", () => {
	it("定義済み data source を一覧で返す", () => {
		expect(dataSourceRepository.findMany()).toEqual(animeMetricDataSources);
	});

	it("id に一致する data source を返す", () => {
		expect(dataSourceRepository.findUnique("d-anime-ranking-daily")).toEqual(
			animeMetricDataSources[0],
		);
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
});
