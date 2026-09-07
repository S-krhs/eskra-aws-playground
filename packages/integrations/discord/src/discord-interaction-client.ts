// In scope: editing a deferred interaction's original message and posting follow-ups, using the interaction token
// Out of scope: parsing an interaction, resolving the token/application ID, building a payload, business rules
import {
	sanitizeText,
	type TextReplacement,
} from "@eskra-aws-playground/libs/string/text-sanitizer.js";
import type { DiscordActionRow } from "./discord-bot-client.js";
import { type JsonResponseDetails, sendJson } from "./internal/send-json.js";

/** Sanitized Discord Interaction API failure detail. */
export type DiscordInteractionResponseDetails = JsonResponseDetails;

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_SNOWFLAKE_PATTERN = /^\d{1,20}$/;

export interface DiscordInteractionMessagePayload {
	content: string;
	/** An empty array removes the original message's buttons. */
	components?: readonly DiscordActionRow[];
	/** Discord message flag — set to make the response visible only to the invoking user. */
	flags?: number;
	allowed_mentions: {
		parse: readonly string[];
		users?: readonly string[];
	};
}

export interface DiscordInteractionMessageOptions {
	timeoutMs?: number;
}

export class DiscordInteractionError extends Error {
	public readonly responseDetails: unknown | null;

	constructor(message: string, responseDetails: unknown | null = null) {
		super(message);
		this.name = "DiscordInteractionError";
		this.responseDetails = responseDetails;
	}
}

/**
 * The interaction token itself is the credential, so this needs no bot token.
 * Discord expires the token 15 minutes after issuance.
 */
export class DiscordInteractionClient {
	private readonly applicationId: string;
	private readonly interactionToken: string;
	private readonly defaultTimeoutMs = 10_000;

	constructor(applicationId: string, interactionToken: string) {
		const normalizedApplicationId = applicationId.trim();
		if (!DISCORD_SNOWFLAKE_PATTERN.test(normalizedApplicationId)) {
			throw new DiscordInteractionError(
				"Discord application ID は 1〜20 桁の数字からなる snowflake である必要があります",
			);
		}

		const normalizedInteractionToken = interactionToken.trim();
		if (normalizedInteractionToken === "") {
			throw new DiscordInteractionError("Discord interaction token が空です");
		}

		this.applicationId = normalizedApplicationId;
		this.interactionToken = normalizedInteractionToken;
	}

	/** Replaces the deferred placeholder message with the final content. */
	public async editOriginalResponse(
		payload: DiscordInteractionMessagePayload,
		options: DiscordInteractionMessageOptions = {},
	): Promise<void> {
		await this.send(
			"PATCH",
			`${this.webhookUrl()}/messages/@original`,
			payload,
			options,
		);
	}

	/** Sends an additional message on the same interaction, separate from the original. */
	public async postFollowupMessage(
		payload: DiscordInteractionMessagePayload,
		options: DiscordInteractionMessageOptions = {},
	): Promise<void> {
		await this.send("POST", this.webhookUrl(), payload, options);
	}

	private async send(
		method: "POST" | "PATCH",
		url: string,
		payload: DiscordInteractionMessagePayload,
		options: DiscordInteractionMessageOptions,
	): Promise<void> {
		try {
			await sendJson({
				method,
				url,
				payload,
				timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
				apiLabel: "Discord Interaction API",
				responseBodyReplacements: this.interactionTokenReplacements(),
				createError: (message, responseDetails) => {
					return new DiscordInteractionError(message, responseDetails);
				},
			});
		} catch (error) {
			throw this.sanitizeUnknownError(error);
		}
	}

	private webhookUrl(): string {
		return `${DISCORD_API_BASE_URL}/webhooks/${this.applicationId}/${this.interactionToken}`;
	}

	private interactionTokenReplacements(): readonly TextReplacement[] {
		return [
			{
				pattern: this.interactionToken,
				replacement: "[redacted-discord-interaction-token]",
			},
		];
	}

	/** Strips the interaction token out of a message thrown by fetch, if present. */
	private sanitizeUnknownError(error: unknown): unknown {
		if (
			error instanceof Error &&
			error.message.includes(this.interactionToken)
		) {
			return new DiscordInteractionError(
				sanitizeText(error.message, {
					replacements: this.interactionTokenReplacements(),
				}),
			);
		}

		return error;
	}
}
