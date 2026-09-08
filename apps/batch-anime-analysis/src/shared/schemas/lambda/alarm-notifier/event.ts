// In scope: the external-input schema and type for the notifier Lambda's (alarm-notifier) launch event
// Out of scope: writing the notification, resolving the webhook URL, sending
import { z } from "zod";

/** The launch event the notifier Lambda receives; a CloudWatch alarm arrives over SNS. */
export const alarmNotifierEventSchema = z.object({
	Records: z.array(
		z.object({
			Sns: z.object({
				Message: z.string(),
				Subject: z.string().optional(),
				Timestamp: z.string().optional(),
			}),
		}),
	),
});

export type AlarmNotifierEvent = z.infer<typeof alarmNotifierEventSchema>;
