// In scope: notifying Discord of each CloudWatch alarm in an SNS event
// Out of scope: the Lambda entry point, swallowing a notification failure, writing the notification
import { DiscordWebhookClient } from "@eskra-aws-playground/integration-discord/discord-webhook-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { alarmNotifierEventSchema } from "@/_shared/schemas/lambda/alarm-notifier/event.js";
import { buildAlarmReport } from "@/features/notifications/alarm-report.js";
import { getAlertSettings } from "./runtime-settings/alert-setting-resolver.js";

const logger = createBatchLogger("alarm-notification");

/** Notifies Discord of the CloudWatch alarms in an SNS event. */
export const alarmNotificationJob = async (event: unknown): Promise<void> => {
	// Validate the whole launch event as the notification job's input and pull out the records to process.
	const { Records } = alarmNotifierEventSchema.parse(event);

	logger.start({ recordCount: Records.length });

	const { discordWebhookUrl } = getAlertSettings();
	const client = new DiscordWebhookClient(discordWebhookUrl);

	for (const record of Records) {
		await client.postMessage(buildAlarmReport(record.Sns.Message));
	}

	logger.complete({ recordCount: Records.length });
};
