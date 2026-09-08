// In scope: deferred-ACKing /hello and enqueuing the follow-up job that posts the public greeting
// Out of scope: routing by interaction type or command, writing the greeting, shaping the HTTP response

import type { DiscordInteractionCallback } from "@eskra-aws-playground/integration-discord/discord-interaction.js";
import {
	type DiscordDeferredMessageResponsePayload,
	responseTypes,
} from "@eskra-aws-playground/integration-discord/interaction-response.js";
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import type { InteractionJobMessage } from "@eskra-aws-playground/shared-domains/discord/interaction-job-message.js";
import { interactionJobNames } from "@eskra-aws-playground/shared-domains/discord/interaction-job-names.js";
import { Resource } from "sst/resource";
import type { OperationResult } from "@/handlers/routes/_shared/intermediate-models/operation-result.js";

/** ACKs /hello with a public deferred response and leaves sending the greeting to a follow-up job. */
export const helloCommandOperation = async (
	callback: DiscordInteractionCallback,
): Promise<OperationResult<DiscordDeferredMessageResponsePayload>> => {
	const message: InteractionJobMessage = {
		job: interactionJobNames.yacchoHelloReply,
		applicationId: callback.applicationId,
		token: callback.token,
	};
	const sender = new SqsMessageSender(Resource.PlaygroundInteractionQueue.url);
	await sender.sendMessages([{ id: "interaction-job", body: message }]);

	return { kind: "OK", data: { type: responseTypes.deferredMessage } };
};
