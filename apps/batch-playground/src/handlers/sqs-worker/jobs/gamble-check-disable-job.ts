// In scope: gamble-check-disable の本人設定を削除し、deferred 応答の元メッセージを確定内容へ差し替える
// Out of scope: ジョブの振り分け、SQS event の解釈、実行場所の検証(route で実施済み)
import { DiscordInteractionClient } from "@eskra-aws-playground/integration-discord/discord-interaction-client.js";
import { channelSettingRepository } from "@eskra-aws-playground/repositories/playground/channel-setting/repository.js";
import { applicationKeys } from "@eskra-aws-playground/repositories/playground/shared/literals/application-key.js";
import { settingKeys } from "@eskra-aws-playground/repositories/playground/shared/literals/setting-key.js";
import type { interactionJobNames } from "@/shared/contracts/interaction-job-names.js";
import type { InteractionJobMessage } from "@/shared/schemas/sqs/interaction-job/message.js";

type GambleCheckDisableMessage = Extract<
	InteractionJobMessage,
	{ job: typeof interactionJobNames.gambleCheckDisable }
>;

/** 実行者本人のリマインダー設定を削除し、deferred 応答を結果メッセージへ差し替える。 */
export const gambleCheckDisableJob = async (
	message: GambleCheckDisableMessage,
): Promise<void> => {
	const deletedSetting =
		await channelSettingRepository.deleteByGuildIdAndUserId({
			applicationKey: applicationKeys.yacchoBot,
			settingKey: settingKeys.playCheckReminder,
			guildId: message.guildId,
			userId: message.userId,
		});

	const client = new DiscordInteractionClient(
		message.applicationId,
		message.token,
	);
	await client.editOriginalResponse({
		content: deletedSetting
			? "りょ～！またね～"
			: "よよよ……リマインダーはまだ設定されていないのです～",
		allowed_mentions: { parse: [] },
	});
};
