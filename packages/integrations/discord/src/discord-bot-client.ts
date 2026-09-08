// In scope: posting a finished Discord message payload and managing application commands, using a bot token
// Out of scope: resolving the bot token, building a payload, parsing an interaction, business rules
import {
	sanitizeText,
	type TextReplacement,
} from "@eskra-aws-playground/libs/string/text-sanitizer.js";
import { fetchJson } from "./internal/fetch-json.js";
import { type JsonResponseDetails, sendJson } from "./internal/send-json.js";

/** Sanitized Discord Bot API failure detail. */
export type DiscordBotResponseDetails = JsonResponseDetails;

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_SNOWFLAKE_PATTERN = /^\d{1,20}$/;

export interface DiscordButtonComponent {
	type: 2;
	style: 1 | 2 | 3 | 4;
	label: string;
	custom_id: string;
}

export interface DiscordActionRow {
	type: 1;
	components: readonly DiscordButtonComponent[];
}

export interface DiscordChannelMessagePayload {
	content?: string;
	components?: readonly DiscordActionRow[];
	allowed_mentions: {
		parse: readonly string[];
		users?: readonly string[];
	};
}

/** Registration definition for a slash command. */
export interface DiscordCommandDefinition {
	name: string;
	description: string;
	options?: readonly DiscordCommandOptionDefinition[];
	default_member_permissions?: string;
	integration_types?: readonly (0 | 1)[];
	contexts?: readonly (0 | 1 | 2)[];
}

export interface DiscordCommandOptionDefinition {
	type: number;
	name: string;
	description: string;
	required?: boolean;
	options?: readonly DiscordCommandOptionDefinition[];
}

/** The main display fields of a command already registered with Discord. */
export interface DiscordRegisteredCommand {
	id: string;
	name: string;
	description: string;
}

export interface DiscordBotRequestOptions {
	timeoutMs?: number;
}

export class DiscordBotError extends Error {
	public readonly responseDetails: unknown | null;

	constructor(message: string, responseDetails: unknown | null = null) {
		super(message);
		this.name = "DiscordBotError";
		this.responseDetails = responseDetails;
	}
}

export class DiscordBotClient {
	private readonly botToken: string;
	private readonly defaultTimeoutMs = 10_000;

	constructor(botToken: string) {
		this.botToken = validateDiscordBotToken(botToken);
	}

	public async postChannelMessage(
		channelId: string,
		payload: DiscordChannelMessagePayload,
		options: DiscordBotRequestOptions = {},
	): Promise<void> {
		const normalizedChannelId = this.validateSnowflake(
			channelId,
			"Discord channel ID",
		);

		try {
			await sendJson({
				method: "POST",
				url: `${DISCORD_API_BASE_URL}/channels/${normalizedChannelId}/messages`,
				headers: {
					Authorization: `Bot ${this.botToken}`,
				},
				payload,
				timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
				apiLabel: "Discord Bot API",
				responseBodyReplacements: this.botTokenReplacements(),
				createError: (message, responseDetails) => {
					return new DiscordBotError(message, responseDetails);
				},
			});
		} catch (error) {
			throw this.sanitizeUnknownError(error);
		}
	}

	/** Bulk-replaces the application's entire global command list with `commands`. */
	public async overwriteGlobalCommands(
		applicationId: string,
		commands: readonly DiscordCommandDefinition[],
		options: DiscordBotRequestOptions = {},
	): Promise<void> {
		const commandsUrl = this.globalCommandsUrl(applicationId);

		try {
			await sendJson({
				method: "PUT",
				url: commandsUrl,
				headers: {
					Authorization: `Bot ${this.botToken}`,
				},
				payload: commands,
				timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
				apiLabel: "Discord Bot API",
				responseBodyReplacements: this.botTokenReplacements(),
				createError: (message, responseDetails) => {
					return new DiscordBotError(message, responseDetails);
				},
			});
		} catch (error) {
			throw this.sanitizeUnknownError(error);
		}
	}

	public async getGlobalCommands(
		applicationId: string,
		options: DiscordBotRequestOptions = {},
	): Promise<readonly DiscordRegisteredCommand[]> {
		const commandsUrl = this.globalCommandsUrl(applicationId);

		try {
			return await fetchJson<readonly DiscordRegisteredCommand[]>({
				url: commandsUrl,
				headers: {
					Authorization: `Bot ${this.botToken}`,
				},
				timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
				apiLabel: "Discord Bot API",
				responseBodyReplacements: this.botTokenReplacements(),
				createError: (message, responseDetails) => {
					return new DiscordBotError(message, responseDetails);
				},
			});
		} catch (error) {
			throw this.sanitizeUnknownError(error);
		}
	}

	/**
	 * Bulk-replaces the guild's command list with `commands`.
	 * A command missing from `commands` gets deleted on Discord's side, so the
	 * declaration and what's registered always match.
	 */
	public async overwriteGuildCommands(
		applicationId: string,
		guildId: string,
		commands: readonly DiscordCommandDefinition[],
		options: DiscordBotRequestOptions = {},
	): Promise<void> {
		const commandsUrl = this.guildCommandsUrl(applicationId, guildId);

		try {
			await sendJson({
				method: "PUT",
				url: commandsUrl,
				headers: {
					Authorization: `Bot ${this.botToken}`,
				},
				payload: commands,
				timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
				apiLabel: "Discord Bot API",
				responseBodyReplacements: this.botTokenReplacements(),
				createError: (message, responseDetails) => {
					return new DiscordBotError(message, responseDetails);
				},
			});
		} catch (error) {
			throw this.sanitizeUnknownError(error);
		}
	}

	/** Read-only. */
	public async getGuildCommands(
		applicationId: string,
		guildId: string,
		options: DiscordBotRequestOptions = {},
	): Promise<readonly DiscordRegisteredCommand[]> {
		const commandsUrl = this.guildCommandsUrl(applicationId, guildId);

		try {
			return await fetchJson<readonly DiscordRegisteredCommand[]>({
				url: commandsUrl,
				headers: {
					Authorization: `Bot ${this.botToken}`,
				},
				timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
				apiLabel: "Discord Bot API",
				responseBodyReplacements: this.botTokenReplacements(),
				createError: (message, responseDetails) => {
					return new DiscordBotError(message, responseDetails);
				},
			});
		} catch (error) {
			throw this.sanitizeUnknownError(error);
		}
	}

	/** Also validates that each ID is a numeric-only snowflake. */
	private guildCommandsUrl(applicationId: string, guildId: string): string {
		const normalizedApplicationId = this.validateSnowflake(
			applicationId,
			"Discord application ID",
		);
		const normalizedGuildId = this.validateSnowflake(
			guildId,
			"Discord guild ID",
		);

		return `${DISCORD_API_BASE_URL}/applications/${normalizedApplicationId}/guilds/${normalizedGuildId}/commands`;
	}

	private globalCommandsUrl(applicationId: string): string {
		const normalizedApplicationId = this.validateSnowflake(
			applicationId,
			"Discord application ID",
		);
		return `${DISCORD_API_BASE_URL}/applications/${normalizedApplicationId}/commands`;
	}

	private validateSnowflake(value: string, label: string): string {
		const normalizedValue = value.trim();
		if (!DISCORD_SNOWFLAKE_PATTERN.test(normalizedValue)) {
			throw new DiscordBotError(
				`${label} は 1〜20 桁の数字からなる snowflake である必要があります`,
			);
		}
		return normalizedValue;
	}

	private botTokenReplacements(): readonly TextReplacement[] {
		return [
			{
				pattern: this.botToken,
				replacement: "[redacted-discord-bot-token]",
			},
		];
	}

	/** Strips the bot token out of a message thrown by fetch, if present. */
	private sanitizeUnknownError(error: unknown): unknown {
		if (error instanceof Error && error.message.includes(this.botToken)) {
			return new DiscordBotError(
				sanitizeText(error.message, {
					replacements: this.botTokenReplacements(),
				}),
			);
		}

		return error;
	}
}

const validateDiscordBotToken = (botToken: string): string => {
	const normalizedBotToken = botToken.trim();
	if (normalizedBotToken === "") {
		throw new DiscordBotError("Discord Bot token が空です");
	}

	return normalizedBotToken;
};
