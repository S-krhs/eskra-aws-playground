// In scope: Discord interaction callback の type・flag・payload 型
// Out of scope: callback payload の生成、メッセージ内容の決定、HTTP response の形成

/** Discord interaction callback type。 */
export const responseTypes = {
	pong: 1,
	message: 4,
	update: 7,
	autocomplete: 8,
} as const;

/** Discord message flag。 */
export const messageFlags = {
	ephemeral: 64,
} as const;

/** Discord PONG interaction callback の payload。 */
export type DiscordPongResponsePayload = {
	type: typeof responseTypes.pong;
};

/** Discord channel message interaction callback の payload。 */
export type DiscordChannelMessageResponsePayload = {
	type: typeof responseTypes.message;
	data: {
		content: string;
		allowed_mentions: { parse: readonly string[] };
	};
};

/** Discord ephemeral interaction callback の payload。 */
export type DiscordEphemeralResponsePayload = {
	type: typeof responseTypes.message;
	data: {
		content: string;
		flags: typeof messageFlags.ephemeral;
		allowed_mentions: { parse: readonly string[] };
	};
};

/** Discord message update interaction callback の payload。 */
export type DiscordUpdateMessageResponsePayload = {
	type: typeof responseTypes.update;
	data: {
		content: string;
		components: readonly [];
		allowed_mentions: { parse: readonly string[] };
	};
};

/** 空の Discord autocomplete interaction callback の payload。 */
export type DiscordEmptyAutocompleteResponsePayload = {
	type: typeof responseTypes.autocomplete;
	data: { choices: readonly [] };
};

/** Discord interaction callback の payload。 */
export type DiscordInteractionResponsePayload =
	| DiscordPongResponsePayload
	| DiscordChannelMessageResponsePayload
	| DiscordEphemeralResponsePayload
	| DiscordUpdateMessageResponsePayload
	| DiscordEmptyAutocompleteResponsePayload;
