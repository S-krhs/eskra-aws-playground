// In scope: the settingKey identifying which kind of Discord setting a row holds
// Out of scope: interpreting a setting's content, DB access, routing

/** settingKey on DiscordUserSetting / DiscordGuildSetting. */
export const settingKeys = {
	playCheckReminder: "play-check-reminder",
} as const;

export type SettingKey = (typeof settingKeys)[keyof typeof settingKeys];
