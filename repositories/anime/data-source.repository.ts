// In scope: reading anime-metric scraping definitions out of the catalog
// Out of scope: running the scrape, converting parser input, outbound notifications
import { animeMetricDataSources } from "./data.js";
import type { AnimeMetricDataSource } from "./types.js";

export const dataSourceRepository = {
	findMany: (): AnimeMetricDataSource[] => {
		return [...animeMetricDataSources];
	},

	findManyByScheduleHour: (scheduleHour: number): AnimeMetricDataSource[] => {
		return animeMetricDataSources.filter((dataSource) => {
			return dataSource.scheduleHourJst === scheduleHour;
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
