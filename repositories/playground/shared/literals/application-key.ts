// In scope: Discord 連携の設定を識別する applicationKey の定義
// Out of scope: 設定内容の解釈、DB 操作、routing、Bot への登録

/** DiscordUserSetting / DiscordGuildSetting の applicationKey。 */
export const applicationKeys = {
	yacchoBot: "yaccho-bot",
	kaguyaBot: "kaguya-bot",
} as const;

/** applicationKey として取り得る値。 */
export type ApplicationKey =
	(typeof applicationKeys)[keyof typeof applicationKeys];
