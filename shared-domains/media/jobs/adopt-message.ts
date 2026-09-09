// In scope: the wire schema for an adoption job's message
// Out of scope: the job names themselves, job implementation, SQS send/receive, routing
import { z } from "zod";
import { mediaJobNames } from "./names.js";

/**
 * The key is all that travels — the worker re-reads the object, so a message delivered after the
 * object has already been taken in finds nothing there and stops.
 */
export const mediaAdoptMessageSchema = z.object({
	job: z.literal(mediaJobNames.mediaAdopt),
	objectKey: z.string().min(1),
});

export type MediaAdoptMessage = z.infer<typeof mediaAdoptMessageSchema>;
