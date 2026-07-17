// In scope: Discord 連携の設定種別を識別する settingKey の定義
// Out of scope: 設定内容の解釈、DB 操作、routing

/** DiscordUserSetting / DiscordGuildSetting の settingKey。 */
export const settingKeys = {
	playCheckReminder: "play-check-reminder",
} as const;

/** settingKey として取り得る値。 */
export type SettingKey = (typeof settingKeys)[keyof typeof settingKeys];
