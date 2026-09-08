// In scope: building the message payload posted to Discord as the play-check reminder
// Out of scope: Discord API calls, the interaction response, judging which button was pressed
import type { DiscordChannelMessagePayload } from "@eskra-aws-playground/integration-discord/discord-bot-client.js";
import { buildCustomId } from "@eskra-aws-playground/shared-domains/discord/custom-id.js";
import { prefixes } from "@eskra-aws-playground/shared-domains/discord/custom-id-prefixes.js";
import {
	REMINDER_CHOICES,
	REMINDER_QUESTION,
} from "@eskra-aws-playground/shared-domains/discord/reminder-choices.js";
import { buttonStyles } from "./button-styles.js";

/** Writes the play-check reminder asking its target user the question. */
export const buildReminderQuestionMessage = (
	targetUserId: string,
): DiscordChannelMessagePayload => {
	return {
		content: `<@${targetUserId}> ${REMINDER_QUESTION}`,
		allowed_mentions: { parse: [], users: [targetUserId] },
	};
};

/** Turns the play-check reminder's choices into a button message. */
export const buildReminderChoicesMessage = (
	targetUserId: string,
): DiscordChannelMessagePayload => {
	return {
		components: [
			{
				type: 1,
				components: REMINDER_CHOICES.map((choice) => {
					return {
						type: 2,
						style: buttonStyles[choice.tone],
						label: choice.label,
						custom_id: buildCustomId({
							prefix: prefixes.playCheckReminder,
							target: targetUserId,
							action: choice.id,
						}),
					};
				}),
			},
		],
		allowed_mentions: { parse: [] },
	};
};
