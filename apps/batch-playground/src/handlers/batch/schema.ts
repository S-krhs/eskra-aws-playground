// In scope: the external-input schemas and types for the batch Lambda's launch event and context, plus the shared response type
// Out of scope: deciding which job names are allowed, resolving a job, the job itself, resolving runtime settings
import { z } from "zod";

/** The launch event this Lambda receives; job is normalized by trimming and lowercasing. */
export const batchEventSchema = z.object({
	job: z.string().trim().toLowerCase().min(1),
});

export type BatchEvent = z.infer<typeof batchEventSchema>;

/** The properties of the Lambda context a job actually uses. */
export const batchContextSchema = z.object({
	invokedFunctionArn: z.string().trim().min(1),
});

export type BatchContext = z.infer<typeof batchContextSchema>;

/** What a media-sync launch carries on top of the job name. */
export const mediaSyncEventSchema = z.object({
	/** Waives the bulk-delete guard; set true on a manual invoke once the deletion has been reviewed. */
	allowBulkDelete: z.boolean().default(false),
});

export type MediaSyncEvent = z.infer<typeof mediaSyncEventSchema>;

export interface BatchResponse {
	ok: true;
	job: string;
	details?: Record<string, unknown>;
}
