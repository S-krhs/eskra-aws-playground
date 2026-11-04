// In scope: registering the caller's gamble-check-enable setting unless that channel already has it, and swapping the deferred response's original message for the final content
// Out of scope: job dispatch, interpreting the SQS event, checking where it was run (the route already did)
import { DiscordInteractionClient } from "@eskra-aws-playground/integration-discord/discord-interaction-client.js";
import { applicationKeys } from "@eskra-aws-playground/repositories/playground/_shared/literals/application-key.js";
import { settingKeys } from "@eskra-aws-playground/repositories/playground/_shared/literals/setting-key.js";
import { channelSettingRepository } from "@eskra-aws-playground/repositories/playground/channel-setting/repository.js";
import type { InteractionJobMessage } from "@eskra-aws-playground/shared-domains/discord/interaction-jobs/message.js";
import type { interactionJobNames } from "@eskra-aws-playground/shared-domains/discord/interaction-jobs/names.js";
import {
	type ChannelAssignment,
	isAssigned,
} from "@/features/channel-assignment/channel-assignments.js";

type GambleCheckEnableMessage = Extract<
	InteractionJobMessage,
	{ job: typeof interactionJobNames.gambleCheckEnable }
>;

/** Enables the caller's reminder in the channel it was run from and swaps the deferred response for the final message. */
export const gambleCheckEnableJob = async (
	message: GambleCheckEnableMessage,
): Promise<void> => {
	// 1. Add the reminder for this channel unless the caller's assignments already hold it.
	const assignment: ChannelAssignment = {
		applicationKey: applicationKeys.yacchoBot,
		settingKey: settingKeys.playCheckReminder,
		guildId: message.guildId,
		channelId: message.channelId,
		userId: message.userId,
	};
	const settings = await channelSettingRepository.findMany({
		applicationKey: assignment.applicationKey,
		settingKey: assignment.settingKey,
		userId: assignment.userId,
	});
	const assignments = settings.map((setting) => {
		return {
			applicationKey: assignment.applicationKey,
			settingKey: assignment.settingKey,
			...setting,
		};
	});
	if (!isAssigned(assignments, assignment)) {
		await channelSettingRepository.insert(assignment);
	}

	// 2. Swap the deferred response for the final message.
	const client = new DiscordInteractionClient(
		message.applicationId,
		message.token,
	);
	await client.editOriginalResponse({
		content: "うけたまかしこまつかまつり〜",
		allowed_mentions: { parse: [] },
	});
};
