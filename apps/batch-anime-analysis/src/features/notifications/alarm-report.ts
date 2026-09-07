// In scope: writing the Discord notification from a CloudWatch alarm's SNS message
// Out of scope: receiving the SNS event, resolving the webhook URL, sending over HTTP

/** The fields of interest in a CloudWatch alarm's SNS message. */
interface CloudWatchAlarmMessage {
	AlarmName?: string;
	AlarmDescription?: string | null;
	NewStateValue?: string;
	NewStateReason?: string;
	StateChangeTime?: string;
	Region?: string;
}

const MAX_REASON_LENGTH = 500;

/** Writes the Discord notification from a CloudWatch alarm's SNS message. */
export const buildAlarmReport = (snsMessage: string): string => {
	const alarm = parseAlarmMessage(snsMessage);

	if (!alarm) {
		return [
			"🚨 **バッチアラート**",
			"",
			truncate(snsMessage, MAX_REASON_LENGTH),
		].join("\n");
	}

	const lines = [
		"🚨 **バッチアラート**",
		`> 🔔 アラーム：${alarm.AlarmName ?? "(不明)"}`,
		`> 📟 状態：${alarm.NewStateValue ?? "(不明)"}`,
	];
	if (alarm.Region) {
		lines.push(`> 🌏 リージョン：${alarm.Region}`);
	}
	if (alarm.StateChangeTime) {
		lines.push(`> 🕒 発生時刻：${alarm.StateChangeTime}`);
	}
	if (alarm.NewStateReason) {
		lines.push("", truncate(alarm.NewStateReason, MAX_REASON_LENGTH));
	}

	return lines.join("\n");
};

/** Reads an SNS message as a CloudWatch alarm; null when it doesn't read as one. */
const parseAlarmMessage = (
	snsMessage: string,
): CloudWatchAlarmMessage | null => {
	try {
		const parsed: unknown = JSON.parse(snsMessage);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"AlarmName" in parsed
		) {
			return parsed as CloudWatchAlarmMessage;
		}
	} catch {
		return null;
	}

	return null;
};

/** Truncates a string to a maximum length. */
const truncate = (text: string, maxLength: number): string => {
	return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};
