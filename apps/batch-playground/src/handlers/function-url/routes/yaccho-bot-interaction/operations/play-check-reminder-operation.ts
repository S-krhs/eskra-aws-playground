// In scope: 遊技リマインダーのボタン押下を検証し、deferred update で ACK して結果反映ジョブを enqueue する
// Out of scope: interaction 種別・コマンドのルーティング、確定メッセージの生成、HTTP response の形成
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { Resource } from "sst/resource";
import {
	type DiscordDeferredUpdateResponsePayload,
	type DiscordEphemeralResponsePayload,
	messageFlags,
	responseTypes,
} from "@/external-protocols/discord-message/interaction-response.js";
import type {
	DiscordInteraction,
	DiscordInteractionCallback,
} from "@/external-protocols/discord-message/parse.js";
import { REMINDER_CHOICES } from "@/features/play-check-reminder/reminder-settings.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";
import { interactionJobNames } from "@/shared/contracts/interaction-job-names.js";
import type { InteractionJobMessage } from "@/shared/schemas/sqs/interaction-job/message.js";
import { prefixes } from "../contracts/prefixes.js";

/**
 * 遊技リマインダーのボタン押下を検証し、押下本人には deferred update で ACK して結果反映ジョブを enqueue する。
 * リマインダーの選択と解釈できない interaction には undefined を返す。
 */
export const playCheckReminderOperation = async (
	interaction: DiscordInteraction,
	callback: DiscordInteractionCallback,
): Promise<
	| OperationResult<
			DiscordDeferredUpdateResponsePayload | DiscordEphemeralResponsePayload
	  >
	| undefined
> => {
	if (interaction.kind !== "message-component") {
		return undefined;
	}

	if (!interaction.customId) {
		return undefined;
	}

	if (
		interaction.customId.prefix !== prefixes.playCheckReminder ||
		!interaction.customId.target
	) {
		return undefined;
	}
	const { target: targetUserId, action } = interaction.customId;

	const choice = REMINDER_CHOICES.find((candidate) => {
		return candidate.id === action;
	});
	if (!choice) {
		return undefined;
	}

	if (interaction.userId !== targetUserId) {
		return {
			kind: "OK",
			data: {
				type: responseTypes.message,
				data: {
					content: `よよよ……これは <@${targetUserId}> さん専用なのです`,
					flags: messageFlags.ephemeral,
					allowed_mentions: { parse: [] },
				},
			},
		};
	}

	const message: InteractionJobMessage = {
		job: interactionJobNames.playCheckReminderChoice,
		applicationId: callback.applicationId,
		token: callback.token,
		action,
	};
	const sender = new SqsMessageSender(Resource.PlaygroundInteractionQueue.url);
	await sender.sendMessages([{ id: "interaction-job", body: message }]);

	return { kind: "OK", data: { type: responseTypes.deferredUpdate } };
};
