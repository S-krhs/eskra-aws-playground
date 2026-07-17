// In scope: Yaccho Bot の Discord component custom_id routing に使う prefix を一元管理する
// Out of scope: custom_id の生成・解釈、routing、operation の実装を行う

/** Yaccho Bot の Discord component custom_id prefix。 */
export const prefixes = {
	playCheckReminder: "play-check-reminder",
} as const;
