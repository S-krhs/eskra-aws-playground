// In scope: アニメ指標スクレイピング対象の静的カタログを定義する
// Out of scope: 定義の読み込み、スクレイピング実行、parser 入力変換、外部通知を行う
import type {
	AnimeApiMetricSource,
	AnimeMetricDataSource,
	AnimeWebpageMetricSource,
} from "./types.js";

const bilibiliApiSourceBase = {
	type: "api",
	url: "https://api.bilibili.com/pgc/web/rank/list?day=3&season_type=1",
	itemsPath: "result/list",
	labelPath: "title",
} as const satisfies Omit<AnimeApiMetricSource, "value">;

const bilibiliRankApiSource: AnimeApiMetricSource = {
	...bilibiliApiSourceBase,
	value: {
		type: "path",
		path: "rank",
	},
};

const bilibiliDanmakuApiSource: AnimeApiMetricSource = {
	...bilibiliApiSourceBase,
	value: {
		type: "path",
		path: "stat/danmaku",
	},
};

const bilibiliFollowApiSource: AnimeApiMetricSource = {
	...bilibiliApiSourceBase,
	value: {
		type: "path",
		path: "stat/follow",
	},
};

const bilibiliSeriesFollowApiSource: AnimeApiMetricSource = {
	...bilibiliApiSourceBase,
	value: {
		type: "path",
		path: "stat/series_follow",
	},
};

const bilibiliViewApiSource: AnimeApiMetricSource = {
	...bilibiliApiSourceBase,
	value: {
		type: "path",
		path: "stat/view",
	},
};

const dAnimeApiSourceBase = {
	type: "api",
	url: "https://animestore.docomo.ne.jp/animestore/rest/WS000122?length=200&rankingType=01",
	itemsPath: "data/workList",
	labelPath: "workInfo/workTitle",
} as const satisfies Omit<AnimeApiMetricSource, "value">;

const dAnimeRankApiSource: AnimeApiMetricSource = {
	...dAnimeApiSourceBase,
	value: {
		type: "path",
		path: "rankingInfo/rank",
	},
};

const dAnimeUsersApiSource: AnimeApiMetricSource = {
	...dAnimeApiSourceBase,
	value: {
		type: "path",
		path: "workInfo/myListCount",
	},
};

const dAnimeFavsApiSource: AnimeApiMetricSource = {
	...dAnimeApiSourceBase,
	value: {
		type: "path",
		path: "workInfo/favoriteCount",
	},
};

const dAnimeTotalNumberApiSource: AnimeApiMetricSource = {
	...dAnimeApiSourceBase,
	value: {
		type: "path",
		path: "rankingInfo/totalNumber",
	},
};

const myAnimeListMembersWebpageSource: AnimeWebpageMetricSource = {
	type: "webpage",
	url: "https://myanimelist.net/anime/season",
	wrapper: {
		selector: ".js-categories-seasonal",
	},
	itemsSelector: ".title",
	label: {
		selector: ".js-title",
	},
	value: {
		type: "element-text",
		target: {
			selector: ".js-members",
		},
	},
};

const myAnimeListScoreWebpageSource: AnimeWebpageMetricSource = {
	type: "webpage",
	url: "https://myanimelist.net/anime/season",
	wrapper: {
		selector: ".js-categories-seasonal",
	},
	itemsSelector: ".title",
	label: {
		selector: ".js-title",
	},
	value: {
		type: "element-text",
		target: {
			selector: ".js-score",
		},
	},
};

const netflixJpTvRankWebpageSource: AnimeWebpageMetricSource = {
	type: "webpage",
	url: "https://www.net-frx.com/p/netflix-popular.html",
	wrapper: {
		selector: ".rank-apo2 .rank-lis-t2",
	},
	itemsSelector: ".netff-not1zz",
	label: {
		selector: "p",
	},
	value: {
		type: "item-index",
	},
};

const netflixJpMovieRankWebpageSource: AnimeWebpageMetricSource = {
	type: "webpage",
	url: "https://www.net-frx.com/p/netflix-popular.html",
	wrapper: {
		selector: ".rank-apo2 .rank-lis-t3",
	},
	itemsSelector: ".netff-not1zz",
	label: {
		selector: "p",
	},
	value: {
		type: "item-index",
	},
};

export const animeMetricDataSources: readonly AnimeMetricDataSource[] = [
	{
		id: "bilibili-rank",
		websiteName: "bilibili",
		metricName: "rank",
		scheduleHour: 22,
		source: bilibiliRankApiSource,
	},
	{
		id: "bilibili-view",
		websiteName: "bilibili",
		metricName: "view",
		scheduleHour: 22,
		source: bilibiliViewApiSource,
	},
	{
		id: "bilibili-danmaku",
		websiteName: "bilibili",
		metricName: "danmaku",
		scheduleHour: 22,
		source: bilibiliDanmakuApiSource,
	},
	{
		id: "bilibili-follow",
		websiteName: "bilibili",
		metricName: "follow",
		scheduleHour: 22,
		source: bilibiliFollowApiSource,
	},
	{
		id: "bilibili-series-follow",
		websiteName: "bilibili",
		metricName: "series_follow",
		scheduleHour: 22,
		source: bilibiliSeriesFollowApiSource,
	},
	{
		id: "danime-rank",
		websiteName: "danime",
		metricName: "rank",
		scheduleHour: 22,
		source: dAnimeRankApiSource,
	},
	{
		id: "danime-users",
		websiteName: "danime",
		metricName: "users",
		scheduleHour: 22,
		source: dAnimeUsersApiSource,
	},
	{
		id: "danime-favs",
		websiteName: "danime",
		metricName: "favs",
		scheduleHour: 22,
		source: dAnimeFavsApiSource,
	},
	{
		id: "danime-total-number",
		websiteName: "danime",
		metricName: "total_number",
		scheduleHour: 22,
		source: dAnimeTotalNumberApiSource,
	},
	{
		id: "my-anime-list-members",
		websiteName: "MyAnimeList",
		metricName: "members",
		scheduleHour: 9,
		source: myAnimeListMembersWebpageSource,
	},
	{
		id: "my-anime-list-score",
		websiteName: "MyAnimeList",
		metricName: "score",
		scheduleHour: 9,
		source: myAnimeListScoreWebpageSource,
	},
	{
		id: "netflix-jp-tv-rank",
		websiteName: "NetFlixJPTV",
		metricName: "rank",
		scheduleHour: 9,
		source: netflixJpTvRankWebpageSource,
	},
	{
		id: "netflix-jp-movie-rank",
		websiteName: "NetflixJPMovie",
		metricName: "rank",
		scheduleHour: 9,
		source: netflixJpMovieRankWebpageSource,
	},
];
