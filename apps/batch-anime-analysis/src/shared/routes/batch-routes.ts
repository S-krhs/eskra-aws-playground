// やること: Batch Anime Analysis app で利用できる batch job 名を一元管理する
// やらないこと: ジョブの実装や Lambda イベントの解釈を行う

/** Batch Anime Analysis app でサポートする job 名。 */
export const batchRoutes = {
	animeScrapingPreview: "anime-scraping-preview",
} as const;

export type BatchRoute = (typeof batchRoutes)[keyof typeof batchRoutes];

/** ルーティングで利用する job 名の一覧。 */
export const batchRouteList = Object.values(batchRoutes);
