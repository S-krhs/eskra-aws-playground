// In scope: swapping /inuihiroshi's deferred response for the public declaration
// Out of scope: job dispatch, interpreting the SQS event, validating the interaction (the route already did)
import { DiscordInteractionClient } from "@eskra-aws-playground/integration-discord/discord-interaction-client.js";
import type {
	InteractionJobMessage,
	interactionJobNames,
} from "@eskra-aws-playground/shared-domains/discord/interaction-jobs/schema.js";

type KaguyaInuihiroshiReplyMessage = Extract<
	InteractionJobMessage,
	{ job: typeof interactionJobNames.kaguyaInuihiroshiReply }
>;

/** Swaps /inuihiroshi's deferred response for the public declaration. */
export const kaguyaInuihiroshiReplyJob = async (
	message: KaguyaInuihiroshiReplyMessage,
): Promise<void> => {
	const client = new DiscordInteractionClient(
		message.applicationId,
		message.token,
	);
	await client.editOriginalResponse({
		content: "自由だ～～～～！！！！！！！",
		allowed_mentions: { parse: [] },
	});
};
