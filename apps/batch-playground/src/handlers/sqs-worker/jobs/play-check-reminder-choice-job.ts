// In scope: 遊技リマインダーのボタン選択に応じて、deferred update の元メッセージをボタンを外した結果へ差し替える
// Out of scope: ジョブの振り分け、SQS event の解釈、押下ユーザーの照合(route で実施済み)
import { DiscordInteractionClient } from "@eskra-aws-playground/integration-discord/discord-interaction-client.js";
import { REMINDER_CHOICES } from "@/features/play-check-reminder/reminder-settings.js";
import type { interactionJobNames } from "@/shared/contracts/interaction-job-names.js";
import type { InteractionJobMessage } from "@/shared/schemas/sqs/interaction-job/message.js";

type PlayCheckReminderChoiceMessage = Extract<
	InteractionJobMessage,
	{ job: typeof interactionJobNames.playCheckReminderChoice }
>;

/** 選択された回答の結果文へ元メッセージを差し替え、ボタンを取り除く。 */
export const playCheckReminderChoiceJob = async (
	message: PlayCheckReminderChoiceMessage,
): Promise<void> => {
	const choice = REMINDER_CHOICES.find((candidate) => {
		return candidate.id === message.action;
	});
	if (!choice) {
		throw new Error(`未対応の遊技リマインダー選択です: ${message.action}`);
	}

	const client = new DiscordInteractionClient(
		message.applicationId,
		message.token,
	);
	await client.editOriginalResponse({
		content: choice.responseMessage,
		components: [],
		allowed_mentions: { parse: [] },
	});
};
