// In scope: dataSource スクレイピング job が使う実行時設定の型と、SST link からの解決を提供する
// Out of scope: Lambda イベント解釈、外部サービス送信、ジョブ判定を行う
import { requireSecret } from "./require-linked-resource.js";

/** dataSource スクレイピング job が使う実行時設定。 */
export interface DataSourceSettings {
	discordWebhookUrl: string;
}

/** dataSource スクレイピング job が使う実行時設定を解決する。 */
export const getDataSourceSettings = (): DataSourceSettings => {
	return {
		discordWebhookUrl: requireSecret("AnimeAnalysisDiscordWebhook"),
	};
};
