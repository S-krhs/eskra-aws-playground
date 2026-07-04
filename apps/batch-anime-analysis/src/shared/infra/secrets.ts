// In scope: handler が使う実行時設定を SST link またはローカル環境変数から取得する
// Out of scope: Lambda イベント解釈、外部サービス送信、ジョブ判定を行う
import { Resource } from "sst/resource";

/** Orchestrator handler が使う実行時設定。 */
export interface OrchestratorSettings {
	queueUrl: string;
}

/** dataSource スクレイピング handler が使う実行時設定。 */
export interface DataSourceSettings {
	discordWebhookUrl: string;
}

/** Orchestrator handler が使う実行時設定を取得する。 */
export const getOrchestratorSettings = (): OrchestratorSettings => {
	let linkedQueueUrl = "";

	try {
		const resources = Resource as unknown as Record<string, { url?: string }>;
		linkedQueueUrl = resources.AnimeAnalysisQueue?.url?.trim() ?? "";
	} catch {
		linkedQueueUrl = "";
	}

	const localQueueUrl = (process.env.ANIME_ANALYSIS_QUEUE_URL || "").trim();
	const queueUrl = linkedQueueUrl || localQueueUrl;
	if (!queueUrl) {
		throw new Error(
			"AnimeAnalysisQueue link または ANIME_ANALYSIS_QUEUE_URL が設定されていません。",
		);
	}

	return {
		queueUrl,
	};
};

/** dataSource スクレイピング handler が使う実行時設定を取得する。 */
export const getDataSourceSettings = (): DataSourceSettings => {
	let linkedDiscordWebhookUrl = "";

	try {
		const resources = Resource as unknown as Record<string, { value?: string }>;
		const linkedDiscordWebhook = resources.AnimeAnalysisDiscordWebhook;
		linkedDiscordWebhookUrl = linkedDiscordWebhook.value?.trim() ?? "";
	} catch {
		linkedDiscordWebhookUrl = "";
	}

	const localDiscordWebhookUrl = (
		process.env.ANIME_ANALYSIS_DISCORD_WEBHOOK_URL ||
		process.env.DEFAULT_DISCORD_WEBHOOK_URL ||
		""
	).trim();
	const discordWebhookUrl = linkedDiscordWebhookUrl || localDiscordWebhookUrl;

	if (!discordWebhookUrl) {
		throw new Error(
			"AnimeAnalysisDiscordWebhook secret またはローカル用 Discord Webhook URL が設定されていません。",
		);
	}

	return {
		discordWebhookUrl,
	};
};
