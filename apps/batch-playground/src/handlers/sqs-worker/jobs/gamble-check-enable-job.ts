// In scope: registering the caller's gamble-check-enable setting and swapping the deferred response's original message for the final content
// Out of scope: job dispatch, interpreting the SQS event, checking where it was run (the route already did)
import { DiscordInteractionClient } from "@eskra-aws-playground/integration-discord/discord-interaction-client.js";
import { channelSettingRepository } from "@eskra-aws-playground/repositories/playground/channel-setting/repository.js";
import { applicationKeys } from "@eskra-aws-playground/repositories/playground/shared/literals/application-key.js";
import { settingKeys } from "@eskra-aws-playground/repositories/playground/shared/literals/setting-key.js";
import type { InteractionJobMessage } from "@eskra-aws-playground/shared-domains/contracts/interaction-job-message.js";
import type { interactionJobNames } from "@eskra-aws-playground/shared-domains/contracts/interaction-job-names.js";

type GambleCheckEnableMessage = Extract<
	InteractionJobMessage,
	{ job: typeof interactionJobNames.gambleCheckEnable }
>;

/** Enables the caller's reminder in the channel it was run from and swaps the deferred response for the final message. */
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
