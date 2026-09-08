// In scope: removing the caller's gamble-check-disable setting and swapping the deferred response's original message for the final content
// Out of scope: job dispatch, interpreting the SQS event, checking where it was run (the route already did)
import { DiscordInteractionClient } from "@eskra-aws-playground/integration-discord/discord-interaction-client.js";
import { applicationKeys } from "@eskra-aws-playground/repositories/playground/_shared/literals/application-key.js";
import { settingKeys } from "@eskra-aws-playground/repositories/playground/_shared/literals/setting-key.js";
import { channelSettingRepository } from "@eskra-aws-playground/repositories/playground/channel-setting/repository.js";
import type { InteractionJobMessage } from "@eskra-aws-playground/shared-domains/discord/interaction-jobs/message.js";
import type { interactionJobNames } from "@eskra-aws-playground/shared-domains/discord/interaction-jobs/names.js";

type GambleCheckDisableMessage = Extract<
	InteractionJobMessage,
	{ job: typeof interactionJobNames.gambleCheckDisable }
>;

/** Removes the caller's own reminder setting and swaps the deferred response for the result message. */
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
