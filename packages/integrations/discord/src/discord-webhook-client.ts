// In scope: sending an HTTP request to a given Discord Webhook URL
// Out of scope: resolving the webhook URL, generating message content, job classification
import { type JsonResponseDetails, sendJson } from "./internal/send-json.js";

/** Sanitized Discord Webhook failure detail. */
export type DiscordWebhookResponseDetails = JsonResponseDetails;

const DISCORD_WEBHOOK_URL_PATTERN =
	/https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/[^\s"'<>]+/gi;

export interface DiscordPayload {
	content: string;
	allowed_mentions: {
		parse: readonly string[];
	};
}

export interface DiscordMessageOptions {
	allowed_mentions?: {
		parse: readonly string[];
	};
	timeoutMs?: number;
}

export class DiscordWebhookError extends Error {
	public readonly responseDetails: unknown | null;

	constructor(message: string, responseDetails: unknown | null = null) {
		super(message);
		this.name = "DiscordWebhookError";
		this.responseDetails = responseDetails;
	}
}

export class DiscordWebhookClient {
	private readonly webhookUrl: string;
	private readonly defaultTimeoutMs = 10_000;

	constructor(webhookUrl: string) {
		this.webhookUrl = validateDiscordWebhookUrl(webhookUrl);
	}

	private async post(
		payload: DiscordPayload,
		timeoutMs: number = this.defaultTimeoutMs,
	): Promise<void> {
		await sendJson({
			method: "POST",
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
