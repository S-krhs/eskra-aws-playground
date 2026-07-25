// In scope: /hello を deferred 応答で ACK し、公開あいさつを送る後追いジョブを enqueue する
// Out of scope: interaction 種別・コマンドのルーティング、あいさつ本文の生成、HTTP response の形成

import type { DiscordInteractionCallback } from "@eskra-aws-playground/integration-discord/discord-interaction.js";
import {
	type DiscordDeferredMessageResponsePayload,
	responseTypes,
} from "@eskra-aws-playground/integration-discord/interaction-response.js";
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import type { InteractionJobMessage } from "@eskra-aws-playground/shared-domains/contracts/interaction-job-message.js";
import { interactionJobNames } from "@eskra-aws-playground/shared-domains/contracts/interaction-job-names.js";
import { Resource } from "sst/resource";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";

/** /hello を公開の deferred 応答で ACK し、あいさつ本文の送信を後追いジョブへ委譲する。 */
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
