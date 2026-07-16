// In scope: 選択肢メッセージの custom_id 形式とボタン表示種別という build・parse 共通の語彙
// Out of scope: メッセージ payload の build、interaction body の parse、署名検証

const DISCORD_BUTTON_STYLES = {
	primary: 1,
	neutral: 2,
	positive: 3,
	negative: 4,
} as const;

export { DISCORD_BUTTON_STYLES };

/** Discord button の意味的な表示種別。 */
export type DiscordButtonTone = keyof typeof DISCORD_BUTTON_STYLES;

/** custom_id の区切り文字。build と parse が同じ形式を共有する。 */
export const CUSTOM_ID_SEPARATOR = ":";

/** 選択肢メッセージの custom_id とボタン表示に必要な定義。 */
export interface DiscordChoiceDefinition {
	customIdPrefix: string;
	choices: readonly {
		id: string;
		label: string;
		tone: DiscordButtonTone;
	}[];
}
