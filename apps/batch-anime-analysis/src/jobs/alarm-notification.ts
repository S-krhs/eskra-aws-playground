// In scope: SNS event の各 CloudWatch alarm を Discord へ通知する
// Out of scope: Lambda エントリポイント、通知失敗の握り潰し、通知文生成の詳細を持つ
import { DiscordWebhookClient } from "@eskra-aws-playground/integration-discord/discord-webhook-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { buildAlarmReport } from "@/features/notifications/alarm-report.js";
import { alarmNotifierEventSchema } from "@/shared/schemas/lambda/alarm-notifier/event.js";
import { getAlertSettings } from "./runtime-settings/alert-setting-resolver.js";

const logger = createBatchLogger("alarm-notification");

/** SNS event に含まれる CloudWatch alarm を Discord へ通知する。 */
export const alarmNotificationJob = async (event: unknown): Promise<void> => {
	// 起動イベント全体を通知 job の入力として検証し、処理する record を取り出す。
	const { Records } = alarmNotifierEventSchema.parse(event);

	logger.start({ recordCount: Records.length });

	const { discordWebhookUrl } = getAlertSettings();
	const client = new DiscordWebhookClient(discordWebhookUrl);

	for (const record of Records) {
		await client.postMessage(buildAlarmReport(record.Sns.Message));
	}

	logger.complete({ recordCount: Records.length });
};
