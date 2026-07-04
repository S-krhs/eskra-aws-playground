// In scope: Batch Anime Analysis app で利用できる batch job 名を一元管理する
// Out of scope: ジョブの実装や Lambda イベントの解釈を行う

/** Batch Anime Analysis app でサポートする job 名。 */
export const batchNames = {
	animeScrapingOrchestrator: "anime-scraping-orchestrator",
	animeScrapingDataSource: "anime-scraping-data-source",
} as const;
