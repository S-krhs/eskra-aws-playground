// In scope: Discord interaction callback type/flag/payload types
// Out of scope: building a callback payload, deciding message content, forming the HTTP response

export const responseTypes = {
	pong: 1,
	message: 4,
	deferredMessage: 5,
	deferredUpdate: 6,
	update: 7,
	autocomplete: 8,
} as const;

export const messageFlags = {
	ephemeral: 64,
} as const;

export type DiscordPongResponsePayload = {
	type: typeof responseTypes.pong;
};

export type DiscordChannelMessageResponsePayload = {
	type: typeof responseTypes.message;
	data: {
		content: string;
		allowed_mentions: { parse: readonly string[] };
	};
};

export type DiscordEphemeralResponsePayload = {
	type: typeof responseTypes.message;
	data: {
		content: string;
		flags: typeof messageFlags.ephemeral;
		allowed_mentions: { parse: readonly string[] };
	};
};

export type DiscordUpdateMessageResponsePayload = {
	type: typeof responseTypes.update;
	data: {
		content: string;
		components: readonly [];
		allowed_mentions: { parse: readonly string[] };
	};
};

export type DiscordEmptyAutocompleteResponsePayload = {
	type: typeof responseTypes.autocomplete;
	data: { choices: readonly [] };
};

/**
 * ACKs within Discord's 3-second limit; the final content shows up later via
 * an edit of the original message. Only set `data.flags` to make it ephemeral.
 */
export type DiscordDeferredMessageResponsePayload = {
	type: typeof responseTypes.deferredMessage;
	data?: { flags: typeof messageFlags.ephemeral };
};

/**
 * For message components. Keeps the original message as-is while ACKing;
 * the final content arrives later via an edit of that message.
 */
export type DiscordDeferredUpdateResponsePayload = {
	type: typeof responseTypes.deferredUpdate;
};

export type DiscordInteractionResponsePayload =
	| DiscordPongResponsePayload
	| DiscordChannelMessageResponsePayload
	| DiscordEphemeralResponsePayload
	| DiscordUpdateMessageResponsePayload
	| DiscordEmptyAutocompleteResponsePayload
	| DiscordDeferredMessageResponsePayload
	| DiscordDeferredUpdateResponsePayload;
