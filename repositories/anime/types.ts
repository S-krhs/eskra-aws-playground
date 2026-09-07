// In scope: the types describing an anime-metric scraping definition
// Out of scope: running the scrape, DB row shapes for persistence, outbound notifications

export type AnimeMetricSourceType = "api" | "webpage";

export type AnimeJsonMetricValueSource =
	| {
			type: "item-index";
	  }
	| {
			type: "path";
			path: string;
	  };

/** How to pull a metric out of an API response. */
export interface AnimeApiMetricSource {
	type: "api";
	url: string;
	itemsPath: string;
	labelPath: string;
	value: AnimeJsonMetricValueSource;
}

/** Picks one element out of an HTML document. */
export interface AnimeHtmlElementSource {
	selector: string;
	index?: number;
}

export type AnimeHtmlMetricValueSource =
	| {
			type: "item-index";
	  }
	| {
			type: "element-text";
			target: AnimeHtmlElementSource;
	  };

/** How to pull a metric out of a webpage. */
export interface AnimeWebpageMetricSource {
	type: "webpage";
	url: string;
	wrapper: AnimeHtmlElementSource;
	itemsSelector: string;
	label: AnimeHtmlElementSource;
	value: AnimeHtmlMetricValueSource;
}

/** One entry in the anime-metric scraping catalog. */
export interface AnimeMetricDataSource {
	id: string;
	websiteName: string;
	metricName: string;
	higherIsBetter: boolean;
	scheduleHourJst: number;
	source: AnimeApiMetricSource | AnimeWebpageMetricSource;
}
