// In scope: swapping the deferred update's original message for the result with its buttons stripped, per the reminder choice pressed
// Out of scope: job dispatch, interpreting the SQS event, checking who pressed it (the route already did)
import { DiscordInteractionClient } from "@eskra-aws-playground/integration-discord/discord-interaction-client.js";
import type {
	InteractionJobMessage,
	interactionJobNames,
} from "@eskra-aws-playground/shared-domains/discord/interaction-jobs/schema.js";
import { REMINDER_CHOICES } from "@eskra-aws-playground/shared-domains/discord/play-check-reminder/schema.js";

type PlayCheckReminderChoiceMessage = Extract<
	InteractionJobMessage,
	{ job: typeof interactionJobNames.playCheckReminderChoice }
>;

/** Swaps the original message for the chosen answer's result text and strips the buttons. */
export const playCheckReminderChoiceJob = async (
	message: PlayCheckReminderChoiceMessage,
): Promise<void> => {
	const choice = REMINDER_CHOICES.find((candidate) => {
		return candidate.id === message.action;
	});
	if (!choice) {
		throw new Error(`未対応の遊技リマインダー選択です: ${message.action}`);
	}

	const client = new DiscordInteractionClient(
		message.applicationId,
		message.token,
	);
	await client.editOriginalResponse({
		content: choice.responseMessage,
		components: [],
		allowed_mentions: { parse: [] },
	});
};
