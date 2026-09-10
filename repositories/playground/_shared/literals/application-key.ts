// In scope: the applicationKey identifying which Discord integration a setting belongs to
// Out of scope: interpreting a setting's content, DB access, routing, registering with the bot

/**
 * A setting is identified by this together with a settingKey, and its own shape goes in a JSONB
 * column — so a new kind of setting only needs new key values here, never a migration.
 */
export const applicationKeys = {
	yacchoBot: "yaccho-bot",
	kaguyaBot: "kaguya-bot",
} as const;

export type ApplicationKey =
	(typeof applicationKeys)[keyof typeof applicationKeys];
