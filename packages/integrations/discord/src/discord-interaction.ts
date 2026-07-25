// In scope: Discord interaction の raw payload を変換した、アプリ内部の型付きモデル
// Out of scope: parse 処理、署名検証、応答 payload の生成

/** Discord application command の subcommand option。 */
export interface DiscordSubcommandOption {
	kind: "subcommand";
	name: string;
	options: readonly DiscordCommandOption[];
}

/** Discord application command の user option。 */
export interface DiscordUserCommandOption {
	kind: "user";
	name: string;
	userId: string;
}

/** アプリが意味を解釈しない Discord application command option。 */
export interface DiscordUnsupportedCommandOption {
	kind: "unsupported";
	discordType: number;
	name: string;
}

/** 用途ごとの意味へ変換した Discord application command option。 */
export type DiscordCommandOption =
	| DiscordSubcommandOption
	| DiscordUserCommandOption
	| DiscordUnsupportedCommandOption;

/** Discord application command の実行コンテキスト。 */
export type DiscordCommandContext =
	| {
			kind: "guild";
			guildId: string;
			channelId?: string;
	  }
	| { kind: "direct-message" };

/** Discord の PING interaction。 */
export interface DiscordPingInteraction {
	kind: "ping";
}

/** Discord application command interaction。 */
export interface DiscordApplicationCommandInteraction {
	kind: "application-command";
	/** コマンドを実行した Discord ユーザー ID。 */
	userId: string;
	command: {
		name: string;
		options: readonly DiscordCommandOption[];
	};
	context: DiscordCommandContext;
}

/** Discord message component interaction。 */
export interface DiscordMessageComponentInteraction {
	kind: "message-component";
	/** Discord から受け取った生の custom_id。規約の解釈は呼び出し側が行う。 */
	customId: string;
	userId: string;
}

/** Discord autocomplete interaction。 */
export interface DiscordAutocompleteInteraction {
	kind: "autocomplete";
}

/** deferred 応答後の元メッセージ編集・follow-up 送信に必要な interaction の callback 情報。 */
export interface DiscordInteractionCallback {
	/** 応答先 application の ID。編集先 webhook URL の組み立てに使う。 */
	applicationId: string;
	/** interaction ごとに発行される応答用 token。発行から 15 分有効。 */
	token: string;
}

/** アプリが対応していない Discord interaction type。 */
export interface DiscordUnsupportedInteraction {
	kind: "unsupported";
	discordType: number;
}

/** Discord の raw payload から変換した、アプリ内部の interaction model。 */
export type DiscordInteraction =
	| DiscordPingInteraction
	| DiscordApplicationCommandInteraction
	| DiscordMessageComponentInteraction
	| DiscordAutocompleteInteraction
	| DiscordUnsupportedInteraction;
