// In scope: /hello の deferred 応答の元メッセージを、公開のあいさつ文へ差し替える
// Out of scope: ジョブの振り分け、SQS event の解釈、interaction の検証(route で実施済み)
import { DiscordInteractionClient } from "@eskra-aws-playground/integration-discord/discord-interaction-client.js";
import type { InteractionJobMessage } from "@eskra-aws-playground/shared-domains/contracts/interaction-job-message.js";
import type { interactionJobNames } from "@eskra-aws-playground/shared-domains/contracts/interaction-job-names.js";

type YacchoHelloReplyMessage = Extract<
	InteractionJobMessage,
	{ job: typeof interactionJobNames.yacchoHelloReply }
>;

/** /hello の deferred 応答を公開のあいさつ文へ差し替える。 */
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
