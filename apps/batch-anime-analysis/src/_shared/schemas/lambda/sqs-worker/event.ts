// In scope: the external-input schema and type for the worker Lambda's (sqs-worker) launch event
// Out of scope: sending to SQS, interpreting a message body's meaning, per-record execution control
import { z } from "zod";

/** The launch event the worker Lambda receives; SQS delivers records in a batch. */
export const sqsWorkerEventSchema = z.object({
	Records: z.array(
		z.object({
			messageId: z.string().min(1),
			body: z.string(),
		}),
	),
});

export type SqsWorkerEvent = z.infer<typeof sqsWorkerEventSchema>;
