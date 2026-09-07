// In scope: taking a CloudWatch alarm's SNS event and delegating to the notification job
// Out of scope: writing the notification, resolving the webhook URL, send detail
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { alarmNotificationJob } from "@/jobs/alarm-notification.js";

const logger = createBatchLogger("alarm-notifier");

/** The entry point of the Lambda notifying Discord of a CloudWatch alarm. */
export const handler = async (event: unknown): Promise<void> => {
	// A failure to notify is logged and swallowed, so it never triggers an SNS retry.
	try {
		await alarmNotificationJob(event);
	} catch (error) {
		logger.failure(error);
	}
};
