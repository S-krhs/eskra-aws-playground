// In scope: gamble-check-enable の実行場所を確認し、deferred 応答で ACK して登録ジョブを enqueue する
// Out of scope: command routing、DB query、HTTP response の形成、確定メッセージの生成

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
import type { InteractionJobMessage } from "@eskra-aws-playground/shared-domains/contracts/interaction-job-message.js";
import { interactionJobNames } from "@eskra-aws-playground/shared-domains/contracts/interaction-job-names.js";
import { Resource } from "sst/resource";
import type { OperationResult } from "@/handlers/routes/intermediate-models/operation-result.js";
import { ephemeralOperation } from "./ephemeral-operation.js";

/** gamble-check-enable の実行場所を確認し、ephemeral な deferred 応答で ACK して登録ジョブを enqueue する。 */
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
