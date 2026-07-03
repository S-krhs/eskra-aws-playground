// In scope: app が使う secret 値を SST link またはローカル環境変数から解決する
// Out of scope: Lambda イベント解釈、外部サービス送信、ジョブ判定を行う
import { Resource } from "sst/resource";

/** Batch Anime Analysis app が使う secret 値。 */
export interface BatchAnimeAnalysisSecrets {
	discordWebhookUrl: string;
}

/** Batch Anime Analysis app が使う secret 値を解決する。 */
export const resolveSecrets = (): BatchAnimeAnalysisSecrets => {
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
