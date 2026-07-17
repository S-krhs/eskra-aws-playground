// In scope: CloudWatch alarm の SNS event を受け取り、通知 job へ委譲する
// Out of scope: 通知文生成、Webhook URL 解決、送信処理の詳細を持つ
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { alarmNotificationJob } from "@/jobs/alarm-notification.js";

const logger = createBatchLogger("alarm-notifier");

/** CloudWatch alarm を Discord へ通知する Lambda のエントリポイント。 */
export const handler = async (event: unknown): Promise<void> => {
	// 通知自体の失敗で SNS 再試行を誘発しないよう、ログに留めて握り潰す。
	try {
		await alarmNotificationJob(event);
	} catch (error) {
		logger.failure(error);
	}
};
