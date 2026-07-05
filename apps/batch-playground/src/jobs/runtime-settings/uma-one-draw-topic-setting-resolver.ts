// In scope: UMA ワンドロお題通知 job が使う実行時設定の型と、SST link/環境変数からの解決を提供する
// Out of scope: Lambda イベント解釈、外部サービス送信、ジョブ判定を行う
import { Resource } from "sst/resource";

/** UMA ワンドロお題通知 job が使う実行時設定。 */
export interface UmaOneDrawTopicSettings {
	discordWebhookUrl: string;
}

/** UMA ワンドロお題通知 job が使う実行時設定を解決する。 */
export const getUmaOneDrawTopicSettings = (): UmaOneDrawTopicSettings => {
	let linkedDiscordWebhookUrl = "";

	try {
		const resources = Resource as unknown as Record<string, { value?: string }>;
		const linkedDiscordWebhook = resources.UmaOneDrawTopicDiscordWebhook;
		linkedDiscordWebhookUrl = linkedDiscordWebhook.value?.trim() ?? "";
	} catch {
		linkedDiscordWebhookUrl = "";
	}

	const localDiscordWebhookUrl = (
		process.env.UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL ||
		process.env.DEFAULT_DISCORD_WEBHOOK_URL ||
		""
	).trim();
	const discordWebhookUrl = linkedDiscordWebhookUrl || localDiscordWebhookUrl;

	if (!discordWebhookUrl) {
		throw new Error(
			"UmaOneDrawTopicDiscordWebhook secret またはローカル用 Discord Webhook URL が設定されていません。",
		);
	}

	return {
		discordWebhookUrl,
	};
};
