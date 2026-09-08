// In scope: orchestrating the batch that posts the play-check reminder to Discord
// Out of scope: writing the reminder message, Discord bot API HTTP detail
import { DiscordBotClient } from "@eskra-aws-playground/integration-discord/discord-bot-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { applicationKeys } from "@eskra-aws-playground/repositories/playground/_shared/literals/application-key.js";
import { settingKeys } from "@eskra-aws-playground/repositories/playground/_shared/literals/setting-key.js";
import { channelSettingRepository } from "@eskra-aws-playground/repositories/playground/channel-setting/repository.js";
import { REMINDER_CHOICES } from "@eskra-aws-playground/shared-domains/discord/play-check-reminder/schema.js";
import { Resource } from "sst/resource";
import {
	buildReminderChoicesMessage,
	buildReminderQuestionMessage,
} from "@/features/play-check-reminder/reminder-message.js";
import type { BatchResponse } from "@/handlers/batch/schema.js";

const logger = createBatchLogger("play-check-reminder");

/** The batch job posting the play-check reminder to a Discord channel as a message with buttons. */
export const playCheckReminderJob = async (
	_event: unknown,
): Promise<BatchResponse> => {
	logger.start();
	// 1. Resolve the Yaccho Bot token and the registered user settings.
	const discordBotToken = Resource.YacchoDiscordBotToken.value;
	const configs = await channelSettingRepository.findMany({
		applicationKey: applicationKeys.yacchoBot,
		settingKey: settingKeys.playCheckReminder,
	});

	// 2. Post the question and choices to every setting; one failure doesn't stop the rest.
	const botClient = new DiscordBotClient(discordBotToken);
	const results = await Promise.allSettled(
		configs.map(async ({ channelId, userId }) => {
			await botClient.postChannelMessage(
				channelId,
				buildReminderQuestionMessage(userId),
			);
			await botClient.postChannelMessage(
				channelId,
				buildReminderChoicesMessage(userId),
			);
		}),
	);
	const failureCount = results.filter((result) => {
		return result.status === "rejected";
	}).length;
	if (failureCount > 0) {
		const notificationError = new Error(
			`${failureCount}件のリマインダー投稿に失敗しました。`,
		);
		logger.failure(notificationError, {
			configCount: configs.length,
			failureCount,
		});
		throw notificationError;
	}

	logger.complete({
		choiceCount: REMINDER_CHOICES.length,
		configCount: configs.length,
	});

	// 3. Return the shared response to the Lambda handler.
	return {
		ok: true,
		job: "play-check-reminder",
		details: {
			choiceCount: REMINDER_CHOICES.length,
			configCount: configs.length,
		},
	};
};
