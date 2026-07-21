// In scope: /inuihiroshi の deferred 応答の元メッセージを、公開の宣言文へ差し替える
// Out of scope: ジョブの振り分け、SQS event の解釈、interaction の検証(route で実施済み)
import { DiscordInteractionClient } from "@eskra-aws-playground/integration-discord/discord-interaction-client.js";
import type { interactionJobNames } from "@/shared/contracts/interaction-job-names.js";
import type { InteractionJobMessage } from "@/shared/schemas/sqs/interaction-job/message.js";

type KaguyaInuihiroshiReplyMessage = Extract<
	InteractionJobMessage,
	{ job: typeof interactionJobNames.kaguyaInuihiroshiReply }
>;

/** /inuihiroshi の deferred 応答を公開の宣言文へ差し替える。 */
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
