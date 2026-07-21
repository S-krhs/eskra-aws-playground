// In scope: /inuihiroshi を deferred 応答で ACK し、公開宣言を送る後追いジョブを enqueue する
// Out of scope: command routing、宣言本文の生成、HTTP response の形成
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { Resource } from "sst/resource";
import {
	type DiscordDeferredMessageResponsePayload,
	responseTypes,
} from "@/external-protocols/discord-message/interaction-response.js";
import type { DiscordInteractionCallback } from "@/external-protocols/discord-message/parse.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";
import { interactionJobNames } from "@/shared/contracts/interaction-job-names.js";
import type { InteractionJobMessage } from "@/shared/schemas/sqs/interaction-job/message.js";

/** /inuihiroshi を公開の deferred 応答で ACK し、宣言本文の送信を後追いジョブへ委譲する。 */
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
