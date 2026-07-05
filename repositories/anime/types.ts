// In scope: アニメ指標スクレイピング定義の型を定義する
// Out of scope: スクレイピング実行、永続化用の DB 行型、外部通知を行う

/** スクレイピング対象の取得方式。 */
export type AnimeMetricSourceType = "api" | "webpage";

/** JSON metric value の取得方法。 */
export type AnimeJsonMetricValueSource =
	| {
			type: "item-index";
	  }
	| {
			type: "path";
			path: string;
	  };

/** API から metric を取り出す定義。 */
export interface AnimeApiMetricSource {
	type: "api";
	url: string;
	itemsPath: string;
	labelPath: string;
	value: AnimeJsonMetricValueSource;
}

/** HTML 上の要素を選ぶ指定。 */
export interface AnimeHtmlElementSource {
	selector: string;
	index?: number;
}

/** HTML metric value の取得方法。 */
export type AnimeHtmlMetricValueSource =
	| {
			type: "item-index";
	  }
	| {
			type: "element-text";
			target: AnimeHtmlElementSource;
	  };

/** Webpage から metric を取り出す定義。 */
export interface AnimeWebpageMetricSource {
	type: "webpage";
	url: string;
	wrapper: AnimeHtmlElementSource;
	itemsSelector: string;
	label: AnimeHtmlElementSource;
	value: AnimeHtmlMetricValueSource;
}

/** アニメ指標スクレイピングで使う repository の 1 項目。 */
export interface AnimeMetricDataSource {
	id: string;
	websiteName: string;
	metricName: string;
	/** この定義をスクレイピングする起動スケジュール（JST の hour）。 */
	scheduleHour: number;
	source: AnimeApiMetricSource | AnimeWebpageMetricSource;
}
