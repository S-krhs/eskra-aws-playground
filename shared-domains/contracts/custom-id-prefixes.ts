// In scope: Discord component custom_id routing に使う prefix を一元管理する
// Out of scope: custom_id の生成・解釈、routing

/** Discord component custom_id prefix。 */
export const prefixes = {
	playCheckReminder: "play-check-reminder",
} as const;
