// In scope: Discord button の意味的な tone と API style 値の対応
// Out of scope: feature 固有の選択肢、button payload、メッセージの生成
import type { DiscordButtonComponent } from "@eskra-aws-playground/integration-discord/discord-bot-client.js";
import type { ButtonTone } from "@eskra-aws-playground/shared-domains/contracts/button-tone.js";

/** Discord button の意味的な tone と API style 値の対応。 */
export const buttonStyles = {
	primary: 1,
	neutral: 2,
	positive: 3,
	negative: 4,
} as const satisfies Record<ButtonTone, DiscordButtonComponent["style"]>;
