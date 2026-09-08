// In scope: mapping a Discord button's semantic tone to the API's style value
// Out of scope: a feature's own choices, the button payload, writing the message
import type { DiscordButtonComponent } from "@eskra-aws-playground/integration-discord/discord-bot-client.js";
import type { ButtonTone } from "@eskra-aws-playground/shared-domains/discord/play-check-reminder/schema.js";

/** A Discord button's semantic tone to the API's style value. */
export const buttonStyles = {
	primary: 1,
	neutral: 2,
	positive: 3,
	negative: 4,
} as const satisfies Record<ButtonTone, DiscordButtonComponent["style"]>;
