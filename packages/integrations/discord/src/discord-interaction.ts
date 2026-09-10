// In scope: the app's internal typed model, converted from a Discord interaction's raw payload
// Out of scope: parsing, signature verification, building a response payload

export interface DiscordSubcommandOption {
	kind: "subcommand";
	name: string;
	options: readonly DiscordCommandOption[];
}

export interface DiscordUserCommandOption {
	kind: "user";
	name: string;
	userId: string;
}

/** A command option this app doesn't interpret. */
export interface DiscordUnsupportedCommandOption {
	kind: "unsupported";
	discordType: number;
	name: string;
}

export type DiscordCommandOption =
	| DiscordSubcommandOption
	| DiscordUserCommandOption
	| DiscordUnsupportedCommandOption;

export type DiscordCommandContext =
	| {
			kind: "guild";
			guildId: string;
			channelId?: string;
	  }
	| { kind: "direct-message" };

export interface DiscordPingInteraction {
	kind: "ping";
}

export interface DiscordApplicationCommandInteraction {
	kind: "application-command";
	/** Discord user who ran the command. */
	userId: string;
	command: {
		name: string;
		options: readonly DiscordCommandOption[];
	};
	context: DiscordCommandContext;
}

export interface DiscordMessageComponentInteraction {
	kind: "message-component";
	/** Raw custom_id as received from Discord — the convention is interpreted by the caller. */
	customId: string;
	userId: string;
}

export interface DiscordAutocompleteInteraction {
	kind: "autocomplete";
}

/** What editing the original message / posting a follow-up after a deferred response needs. */
export interface DiscordInteractionCallback {
	/** Used to build the edit-target webhook URL. */
	applicationId: string;
	/** Issued per interaction, valid for 15 minutes. */
	token: string;
}

export interface DiscordUnsupportedInteraction {
	kind: "unsupported";
	discordType: number;
}

export type DiscordInteraction =
	| DiscordPingInteraction
	| DiscordApplicationCommandInteraction
	| DiscordMessageComponentInteraction
	| DiscordAutocompleteInteraction
	| DiscordUnsupportedInteraction;
