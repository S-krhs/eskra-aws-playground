// In scope: Bot token を使った完成済み Discord message payload の API 投稿
// Out of scope: Bot token の解決、payload の構築、interaction の parse、業務ルール
import {
	sanitizeText,
	type TextReplacement,
} from "@eskra-aws-playground/libs/string/text-sanitizer.js";
import {
	type JsonPostResponseDetails,
	postJson,
} from "./internal/post-json.js";

/** Discord Bot API 失敗応答の安全化済み詳細。 */
export type DiscordBotResponseDetails = JsonPostResponseDetails;

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_CHANNEL_ID_PATTERN = /^\d+$/;

/** Discord メッセージのボタンコンポーネント。 */
export interface DiscordButtonComponent {
	type: 2;
	style: 1 | 2 | 3 | 4;
	label: string;
	custom_id: string;
}

/** ボタンを並べる action row コンポーネント。 */
export interface DiscordActionRow {
	type: 1;
	components: readonly DiscordButtonComponent[];
}

/** Bot がチャンネルへ送るメッセージ payload。 */
export interface DiscordChannelMessagePayload {
	content?: string;
	components?: readonly DiscordActionRow[];
	allowed_mentions: {
		parse: readonly string[];
		users?: readonly string[];
	};
}

/** Discord Bot API のメッセージ投稿時に上書きできるオプション。 */
export interface DiscordBotMessageOptions {
	timeoutMs?: number;
}

/** Discord Bot API 連携で発生した失敗を表すエラー。 */
export class DiscordBotError extends Error {
	public readonly responseDetails: unknown | null;

	constructor(message: string, responseDetails: unknown | null = null) {
		super(message);
		this.name = "DiscordBotError";
		this.responseDetails = responseDetails;
	}
}

/** Discord Bot API へのメッセージ投稿を担当するクライアント。 */
export class DiscordBotClient {
	private readonly botToken: string;
	private readonly defaultTimeoutMs = 10_000;

	constructor(botToken: string) {
		this.botToken = validateDiscordBotToken(botToken);
	}

	/** チャンネルへメッセージを投稿する。 */
	public async postChannelMessage(
		channelId: string,
		payload: DiscordChannelMessagePayload,
		options: DiscordBotMessageOptions = {},
	): Promise<void> {
		const normalizedChannelId = channelId.trim();
		if (!DISCORD_CHANNEL_ID_PATTERN.test(normalizedChannelId)) {
			throw new DiscordBotError(
				"Discord channel ID は数字のみの snowflake である必要があります",
			);
		}

		try {
			await postJson({
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

	/** bot token を秘匿するための置換ルール。 */
	private botTokenReplacements(): readonly TextReplacement[] {
		return [
			{
				pattern: this.botToken,
				replacement: "[redacted-discord-bot-token]",
			},
		];
	}

	/** fetch が投げた例外のメッセージから bot token を除去して返す。 */
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
