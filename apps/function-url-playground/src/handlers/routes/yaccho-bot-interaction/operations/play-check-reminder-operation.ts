// In scope: validating a play-reminder button press, ACKing it with a deferred update, and enqueuing the job that records the answer
// Out of scope: routing by interaction type or command, writing the final message, shaping the HTTP response

import type {
	DiscordInteraction,
	DiscordInteractionCallback,
} from "@eskra-aws-playground/integration-discord/discord-interaction.js";
import {
	type DiscordDeferredUpdateResponsePayload,
	type DiscordEphemeralResponsePayload,
	messageFlags,
	responseTypes,
} from "@eskra-aws-playground/integration-discord/interaction-response.js";
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { parseCustomId } from "@eskra-aws-playground/shared-domains/discord/custom-id.js";
import { prefixes } from "@eskra-aws-playground/shared-domains/discord/custom-id-prefixes.js";
import type { InteractionJobMessage } from "@eskra-aws-playground/shared-domains/discord/interaction-job-message.js";
import { interactionJobNames } from "@eskra-aws-playground/shared-domains/discord/interaction-job-names.js";
import { REMINDER_CHOICES } from "@eskra-aws-playground/shared-domains/discord/reminder-choices.js";
import { Resource } from "sst/resource";
import type { OperationResult } from "@/handlers/routes/_shared/intermediate-models/operation-result.js";

/**
 * Validates a play-reminder button press, ACKs the person who pressed it with a deferred update, and
 * enqueues the job recording the answer. An interaction that doesn't read as a reminder choice returns undefined.
 */
export const playCheckReminderOperation = async (
	interaction: DiscordInteraction,
	callback: DiscordInteractionCallback,
): Promise<
	| OperationResult<
			DiscordDeferredUpdateResponsePayload | DiscordEphemeralResponsePayload
	  >
	| undefined
> => {
	if (interaction.kind !== "message-component") {
		return undefined;
	}

	const customId = parseCustomId(interaction.customId);
	if (
		!customId ||
		customId.prefix !== prefixes.playCheckReminder ||
		!customId.target
	) {
		return undefined;
	}
	const { target: targetUserId, action } = customId;

	const choice = REMINDER_CHOICES.find((candidate) => {
		return candidate.id === action;
	});
	if (!choice) {
		return undefined;
	}

	if (interaction.userId !== targetUserId) {
		return {
			kind: "OK",
			data: {
				type: responseTypes.message,
				data: {
					content: `よよよ……これは <@${targetUserId}> さん専用なのです`,
					flags: messageFlags.ephemeral,
					allowed_mentions: { parse: [] },
				},
			},
		};
	}

	const message: InteractionJobMessage = {
		job: interactionJobNames.playCheckReminderChoice,
		applicationId: callback.applicationId,
		token: callback.token,
		action,
	};
	const sender = new SqsMessageSender(Resource.PlaygroundInteractionQueue.url);
	await sender.sendMessages([{ id: "interaction-job", body: message }]);

	return { kind: "OK", data: { type: responseTypes.deferredUpdate } };
};
