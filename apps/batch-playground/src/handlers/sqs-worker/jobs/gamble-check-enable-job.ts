// In scope: gamble-check-enable の本人設定を登録し、deferred 応答の元メッセージを確定内容へ差し替える
// Out of scope: ジョブの振り分け、SQS event の解釈、実行場所の検証(route で実施済み)
import { DiscordInteractionClient } from "@eskra-aws-playground/integration-discord/discord-interaction-client.js";
import { channelSettingRepository } from "@eskra-aws-playground/repositories/playground/channel-setting/repository.js";
import { applicationKeys } from "@eskra-aws-playground/repositories/playground/shared/literals/application-key.js";
import { settingKeys } from "@eskra-aws-playground/repositories/playground/shared/literals/setting-key.js";
import type { interactionJobNames } from "@/shared/contracts/interaction-job-names.js";
import type { InteractionJobMessage } from "@/shared/schemas/sqs/interaction-job/message.js";

type GambleCheckEnableMessage = Extract<
	InteractionJobMessage,
	{ job: typeof interactionJobNames.gambleCheckEnable }
>;

/** 実行チャンネルで本人のリマインダーを有効にし、deferred 応答を確定メッセージへ差し替える。 */
export const gambleCheckEnableJob = async (
	message: GambleCheckEnableMessage,
): Promise<void> => {
	await channelSettingRepository.save({
		applicationKey: applicationKeys.yacchoBot,
		settingKey: settingKeys.playCheckReminder,
		guildId: message.guildId,
		channelId: message.channelId,
		userId: message.userId,
	});

	const client = new DiscordInteractionClient(
		message.applicationId,
		message.token,
	);
	await client.editOriginalResponse({
		content: "うけたまかしこまつかまつり〜",
		allowed_mentions: { parse: [] },
	});
};
