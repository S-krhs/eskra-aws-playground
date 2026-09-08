// In scope: the schemas for the sqs-worker Lambda's launch event and message body, plus the partial batch response type it returns
// Out of scope: interpreting a message body's meaning, resolving a job, controlling per-record execution
import { interactionJobMessageSchema } from "@eskra-aws-playground/shared-domains/discord/interaction-job-message.js";
import { mediaThumbnailMessageSchema } from "@eskra-aws-playground/shared-domains/media/jobs.js";
import { z } from "zod";

/** The launch event this Lambda receives; SQS delivers records in a batch. */
export const sqsWorkerEventSchema = z.object({
	Records: z.array(
		z.object({
			messageId: z.string().min(1),
			body: z.string(),
			// SQS counts deliveries per message. A job that has to give up before the DLQ takes over
			// reads how many times it has been handed this message from here
			attributes: z
				.object({
					ApproximateReceiveCount: z.coerce.number().int().min(1).catch(1),
				})
				.optional(),
		}),
	),
});

export type SqsWorkerEvent = z.infer<typeof sqsWorkerEventSchema>;

/**
 * The message bodies sqs-worker receives. This handler runs as a separate Lambda per queue, so every
 * shape is accepted together and the job name alone resolves the owning job, whichever queue it came from.
 */
export const sqsJobMessageSchema = z.union([
	interactionJobMessageSchema,
	mediaThumbnailMessageSchema,
]);

export type SqsJobMessage = z.infer<typeof sqsJobMessageSchema>;

/** The SQS partial batch response; only the failed records go back for retry. */
export interface SqsWorkerResponse {
	batchItemFailures: {
		itemIdentifier: string;
	}[];
}
