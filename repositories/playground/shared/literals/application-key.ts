// In scope: the applicationKey identifying which Discord integration a setting belongs to
// Out of scope: interpreting a setting's content, DB access, routing, registering with the bot

/** applicationKey on DiscordUserSetting / DiscordGuildSetting. */
export const applicationKeys = {
	yacchoBot: "yaccho-bot",
	kaguyaBot: "kaguya-bot",
} as const;

export type ApplicationKey =
	(typeof applicationKeys)[keyof typeof applicationKeys];
