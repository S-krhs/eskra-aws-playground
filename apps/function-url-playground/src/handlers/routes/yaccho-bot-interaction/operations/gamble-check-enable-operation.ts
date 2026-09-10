// In scope: checking where gamble-check-enable was run, deferred-ACKing it, and enqueuing the registration job
// Out of scope: command routing, DB queries, shaping the HTTP response, writing the final message

import type {
	DiscordApplicationCommandInteraction,
	DiscordInteractionCallback,
} from "@eskra-aws-playground/integration-discord/discord-interaction.js";
import {
	type DiscordDeferredMessageResponsePayload,
	type DiscordEphemeralResponsePayload,
	messageFlags,
	responseTypes,
} from "@eskra-aws-playground/integration-discord/interaction-response.js";
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import type { InteractionJobMessage } from "@eskra-aws-playground/shared-domains/discord/interaction-jobs/message.js";
import { interactionJobNames } from "@eskra-aws-playground/shared-domains/discord/interaction-jobs/names.js";
import { Resource } from "sst/resource";
import type { OperationResult } from "@/handlers/routes/_shared/intermediate-models/operation-result.js";
import { ephemeralOperation } from "./ephemeral-operation.js";

/** Checks where it was run, ACKs with an ephemeral deferred response, and enqueues the registration job. */
export const gambleCheckEnableOperation = async (
	interaction: DiscordApplicationCommandInteraction,
	callback: DiscordInteractionCallback,
): Promise<
	OperationResult<
		DiscordEphemeralResponsePayload | DiscordDeferredMessageResponsePayload
	>
> => {
	if (interaction.context.kind !== "guild" || !interaction.context.channelId) {
		return ephemeralOperation("サーバー内のチャンネルで使ってね～");
	}

	const message: InteractionJobMessage = {
		job: interactionJobNames.gambleCheckEnable,
		applicationId: callback.applicationId,
		token: callback.token,
		guildId: interaction.context.guildId,
		channelId: interaction.context.channelId,
		userId: interaction.userId,
	};
	const sender = new SqsMessageSender(Resource.PlaygroundInteractionQueue.url);
	await sender.sendMessages([{ id: "interaction-job", body: message }]);

	return {
		kind: "OK",
		data: {
			type: responseTypes.deferredMessage,
			data: { flags: messageFlags.ephemeral },
		},
	};
};
