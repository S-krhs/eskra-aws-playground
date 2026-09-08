// In scope: deferred-ACKing /inuihiroshi and enqueuing the follow-up job that posts the public declaration
// Out of scope: command routing, writing the declaration, shaping the HTTP response

import type { DiscordInteractionCallback } from "@eskra-aws-playground/integration-discord/discord-interaction.js";
import {
	type DiscordDeferredMessageResponsePayload,
	responseTypes,
} from "@eskra-aws-playground/integration-discord/interaction-response.js";
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import {
	type InteractionJobMessage,
	interactionJobNames,
} from "@eskra-aws-playground/shared-domains/discord/interaction-jobs/schema.js";
import { Resource } from "sst/resource";
import type { OperationResult } from "@/handlers/routes/_shared/intermediate-models/operation-result.js";

/** ACKs /inuihiroshi with a public deferred response and leaves sending the declaration to a follow-up job. */
export const inuihiroshiCommandOperation = async (
	callback: DiscordInteractionCallback,
): Promise<OperationResult<DiscordDeferredMessageResponsePayload>> => {
	const message: InteractionJobMessage = {
		job: interactionJobNames.kaguyaInuihiroshiReply,
		applicationId: callback.applicationId,
		token: callback.token,
	};
	const sender = new SqsMessageSender(Resource.PlaygroundInteractionQueue.url);
	await sender.sendMessages([{ id: "interaction-job", body: message }]);

	return { kind: "OK", data: { type: responseTypes.deferredMessage } };
};
