// In scope: Discord interaction body の JSON 構文解析と、用途ごとの intermediate model への変換
// Out of scope: custom_id の機能固有な値検証、署名検証、業務ルール、HTTP 通信
import { z } from "zod";
import { type DiscordCustomId, parseCustomId } from "./custom-id.js";

const rawInteractionTypes = {
	ping: 1,
	command: 2,
	component: 3,
	autocomplete: 4,
} as const;

const rawCommandOptionTypes = {
	subcommand: 1,
	user: 6,
} as const;

const discordSnowflakeSchema = z.string().regex(/^\d{1,20}$/);

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
	/** 共通 custom_id 規約に合わない場合は null。 */
	customId: DiscordCustomId | null;
	userId: string;
}

/** Discord autocomplete interaction。 */
export interface DiscordAutocompleteInteraction {
	kind: "autocomplete";
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

type RawDiscordCommandOption =
	| {
			type: typeof rawCommandOptionTypes.subcommand;
			name: string;
			options?: readonly RawDiscordCommandOption[];
	  }
	| {
			type: typeof rawCommandOptionTypes.user;
			name: string;
			value: string;
	  }
	| {
			type: number;
			name: string;
			value?: string | number | boolean;
			options?: readonly RawDiscordCommandOption[];
	  };

const commandOptionSchema: z.ZodType<RawDiscordCommandOption> = z.lazy(() => {
	return z.union([
		z.object({
			type: z.literal(rawCommandOptionTypes.subcommand),
			name: z.string(),
			value: z.never().optional(),
			options: z.array(commandOptionSchema).optional(),
		}),
		z.object({
			type: z.literal(rawCommandOptionTypes.user),
			name: z.string(),
			value: discordSnowflakeSchema,
			options: z.never().optional(),
		}),
		z.object({
			type: z.number().refine((type) => {
				return (
					type !== rawCommandOptionTypes.subcommand &&
					type !== rawCommandOptionTypes.user
				);
			}),
			name: z.string(),
			value: z.union([z.string(), z.number(), z.boolean()]).optional(),
			options: z.array(commandOptionSchema).optional(),
		}),
	]);
});

const interactionBodySchema = z.object({
	type: z.number(),
	data: z
		.object({
			name: z.string().optional(),
			options: z.array(commandOptionSchema).optional(),
			custom_id: z.string().optional(),
		})
		.optional(),
	member: z
		.object({
			user: z.object({ id: discordSnowflakeSchema }).optional(),
		})
		.optional(),
	user: z.object({ id: discordSnowflakeSchema }).optional(),
	guild_id: discordSnowflakeSchema.optional(),
	channel_id: discordSnowflakeSchema.optional(),
});

const interactionTypeSchema = z.object({ type: z.number() });

const toCommandOption = (
	option: RawDiscordCommandOption,
): DiscordCommandOption => {
	if (option.type === rawCommandOptionTypes.subcommand) {
		return {
			kind: "subcommand",
			name: option.name,
			options: (option.options ?? []).map(toCommandOption),
		};
	}

	if (
		option.type === rawCommandOptionTypes.user &&
		typeof option.value === "string" &&
		discordSnowflakeSchema.safeParse(option.value).success
	) {
		return { kind: "user", name: option.name, userId: option.value };
	}

	return {
		kind: "unsupported",
		discordType: option.type,
		name: option.name,
	};
};

/** JSON body を用途ごとの Discord interaction として parse する。 */
export const parseInteraction = (
	rawBody: string,
): DiscordInteraction | undefined => {
	// JSON 文字列の構文解析は JSON.parse、parse 後の構造検証は Zod が担当する。
	let json: unknown;
	try {
		json = JSON.parse(rawBody) as unknown;
	} catch {
		return undefined;
	}

	const parsedType = interactionTypeSchema.safeParse(json);
	if (!parsedType.success) {
		return undefined;
	}

	if (parsedType.data.type === rawInteractionTypes.ping) {
		return { kind: "ping" };
	}
	if (
		parsedType.data.type !== rawInteractionTypes.command &&
		parsedType.data.type !== rawInteractionTypes.component &&
		parsedType.data.type !== rawInteractionTypes.autocomplete
	) {
		return { kind: "unsupported", discordType: parsedType.data.type };
	}

	const parsed = interactionBodySchema.safeParse(json);
	if (!parsed.success) {
		return undefined;
	}
	const body = parsed.data;

	if (body.type === rawInteractionTypes.command) {
		const userId = body.guild_id ? body.member?.user?.id : body.user?.id;
		if (!body.data?.name || !userId) {
			return undefined;
		}

		return {
			kind: "application-command",
			userId,
			command: {
				name: body.data.name,
				options: (body.data.options ?? []).map(toCommandOption),
			},
			context: body.guild_id
				? {
						kind: "guild",
						guildId: body.guild_id,
						channelId: body.channel_id,
					}
				: { kind: "direct-message" },
		};
	}

	if (body.type === rawInteractionTypes.component) {
		const rawCustomId = body.data?.custom_id;
		const userId = body.member?.user?.id ?? body.user?.id;
		if (!rawCustomId || !userId) {
			return undefined;
		}

		return {
			kind: "message-component",
			customId: parseCustomId(rawCustomId) ?? null,
			userId,
		};
	}

	if (body.type === rawInteractionTypes.autocomplete) {
		const hasUser = body.guild_id
			? Boolean(body.member?.user?.id)
			: Boolean(body.user?.id);
		if (!body.data?.name || !hasUser) {
			return undefined;
		}
		return { kind: "autocomplete" };
	}

	return undefined;
};
