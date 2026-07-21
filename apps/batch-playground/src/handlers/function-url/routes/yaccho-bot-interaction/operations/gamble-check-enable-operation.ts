// In scope: gamble-check-enable の実行場所を確認し、deferred 応答で ACK して登録ジョブを enqueue する
// Out of scope: command routing、DB query、HTTP response の形成、確定メッセージの生成
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { Resource } from "sst/resource";
import {
	type DiscordDeferredMessageResponsePayload,
	type DiscordEphemeralResponsePayload,
	messageFlags,
	responseTypes,
} from "@/external-protocols/discord-message/interaction-response.js";
import type {
	DiscordApplicationCommandInteraction,
	DiscordInteractionCallback,
} from "@/external-protocols/discord-message/parse.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";
import { interactionJobNames } from "@/shared/contracts/interaction-job-names.js";
import type { InteractionJobMessage } from "@/shared/schemas/sqs/interaction-job/message.js";
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
