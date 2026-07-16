// In scope: 指定された Discord Webhook URL へ HTTP リクエストを送信する
// Out of scope: Webhook URL の解決、メッセージ内容の生成、ジョブ判定を行う
import {
	type JsonPostResponseDetails,
	postJson,
} from "./internal/post-json.js";

/** Discord Webhook 失敗応答の安全化済み詳細。 */
export type DiscordWebhookResponseDetails = JsonPostResponseDetails;

const DISCORD_WEBHOOK_URL_PATTERN =
	/https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/[^\s"'<>]+/gi;

/** Discord Webhook API に送る payload。 */
export interface DiscordPayload {
	content: string;
	allowed_mentions: {
		parse: readonly string[];
	};
}

/** Discord Webhook のテキスト送信時に上書きできるオプション。 */
export interface DiscordMessageOptions {
	allowed_mentions?: {
		parse: readonly string[];
	};
	timeoutMs?: number;
}

/** Discord Webhook 連携で発生した失敗を表すエラー。 */
export class DiscordWebhookError extends Error {
	public readonly responseDetails: unknown | null;

	constructor(message: string, responseDetails: unknown | null = null) {
		super(message);
		this.name = "DiscordWebhookError";
		this.responseDetails = responseDetails;
	}
}

/** Discord Webhook URL への送信を担当するクライアント。 */
export class DiscordWebhookClient {
	private readonly webhookUrl: string;
	private readonly defaultTimeoutMs = 10_000;

	constructor(webhookUrl: string) {
		this.webhookUrl = validateDiscordWebhookUrl(webhookUrl);
	}

	/** Discord Webhook API へ payload を POST する。 */
	private async post(
		payload: DiscordPayload,
		timeoutMs: number = this.defaultTimeoutMs,
	): Promise<void> {
		await postJson({
			url: this.webhookUrl,
			payload,
			timeoutMs,
			apiLabel: "Discord Webhook",
			responseBodyReplacements: [
				{
					pattern: DISCORD_WEBHOOK_URL_PATTERN,
					replacement: "[redacted-discord-webhook-url]",
				},
			],
			createError: (message, responseDetails) => {
				return new DiscordWebhookError(message, responseDetails);
			},
		});
	}

	/** テキスト本文を Discord Webhook API へ送信する。 */
	public async postMessage(
		content: string,
		options: DiscordMessageOptions = {},
	): Promise<void> {
		await this.post(
			{
				content,
				allowed_mentions: options.allowed_mentions ?? {
					parse: [],
				},
			},
			options.timeoutMs,
		);
	}
}

const validateDiscordWebhookUrl = (webhookUrl: string): string => {
	const normalizedWebhookUrl = webhookUrl.trim();

	let parsedWebhookUrl: URL;
	try {
		parsedWebhookUrl = new URL(normalizedWebhookUrl);
	} catch {
		throw new DiscordWebhookError("Discord Webhook URL の形式が不正です");
	}

	const allowedHostnames = ["discord.com", "discordapp.com"];
	if (parsedWebhookUrl.protocol !== "https:") {
		throw new DiscordWebhookError(
			"Discord Webhook URL は https である必要があります",
		);
	}

	if (!allowedHostnames.includes(parsedWebhookUrl.hostname)) {
		throw new DiscordWebhookError(
			"Discord Webhook URL の送信先ホストが許可されていません",
		);
	}

	if (!parsedWebhookUrl.pathname.startsWith("/api/webhooks/")) {
		throw new DiscordWebhookError(
			"Discord Webhook URL のパスが Discord Webhook API ではありません",
		);
	}

	return normalizedWebhookUrl;
};
