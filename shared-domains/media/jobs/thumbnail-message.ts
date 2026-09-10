// In scope: the wire schema for a thumbnail job's message
// Out of scope: the job names themselves, how many deliveries it gets, job implementation, SQS send/receive, routing
import { z } from "zod";
import { mediaJobNames } from "./names.js";

/** One thumbnail-generation request — carries only what's needed to locate the source. */
export const mediaThumbnailMessageSchema = z.object({
	job: z.literal(mediaJobNames.mediaThumbnail),
	mediaId: z.uuid(),
	objectKey: z.string().min(1),
});

export type MediaThumbnailMessage = z.infer<typeof mediaThumbnailMessageSchema>;
