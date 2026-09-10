// In scope: the types describing an anime-metric scraping definition
// Out of scope: running the scrape, DB row shapes for persistence, outbound notifications

export type AnimeMetricSourceType = "api" | "webpage";

/** `item-index` makes the position in the list the metric, which is how a ranking is read. */
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

/** `item-index` makes the position in the list the metric, which is how a ranking is read. */
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
	/** True when a larger value ranks higher; false for a rank, where a smaller one does. Orders the notification. */
	higherIsBetter: boolean;
	/** Which of the orchestrator's runs picks this definition up. */
	scheduleHourJst: number;
	source: AnimeApiMetricSource | AnimeWebpageMetricSource;
}
