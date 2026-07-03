// やること: app が使う secret 値を SST link またはローカル環境変数から解決する
// やらないこと: Lambda イベント解釈、外部サービス送信、ジョブ判定を行う
import { Resource } from "sst/resource";

/** Batch Playground app が使う secret 値。 */
export interface BatchPlaygroundSecrets {
	discordWebhookUrl: string;
}

/** Batch Playground app が使う secret 値を解決する。 */
export const resolveSecrets = (): BatchPlaygroundSecrets => {
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
