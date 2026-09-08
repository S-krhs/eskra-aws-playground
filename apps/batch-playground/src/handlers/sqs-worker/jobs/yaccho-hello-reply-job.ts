// In scope: swapping /hello's deferred response for the public greeting
// Out of scope: job dispatch, interpreting the SQS event, validating the interaction (the route already did)
import { DiscordInteractionClient } from "@eskra-aws-playground/integration-discord/discord-interaction-client.js";
import type {
	InteractionJobMessage,
	interactionJobNames,
} from "@eskra-aws-playground/shared-domains/discord/interaction-jobs/schema.js";

type YacchoHelloReplyMessage = Extract<
	InteractionJobMessage,
	{ job: typeof interactionJobNames.yacchoHelloReply }
>;

/** Swaps /hello's deferred response for the public greeting. */
export const yacchoHelloReplyJob = async (
	message: YacchoHelloReplyMessage,
): Promise<void> => {
	const client = new DiscordInteractionClient(
		message.applicationId,
		message.token,
	);
	await client.editOriginalResponse({
		content: "やおよろ～🌚",
		allowed_mentions: { parse: [] },
	});
};
