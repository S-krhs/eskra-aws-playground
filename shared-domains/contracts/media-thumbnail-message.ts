// In scope: the external-input schema and type for a thumbnail-generation job message received by sqs-worker
// Out of scope: SQS send/receive, generating the thumbnail, writing it to R2 and the DB
import { z } from "zod";
import { mediaJobNames } from "./media-job-names.js";

/** One thumbnail-generation request — carries only what's needed to locate the source. */
export const mediaThumbnailMessageSchema = z.object({
	job: z.literal(mediaJobNames.mediaThumbnail),
	mediaId: z.uuid(),
	objectKey: z.string().min(1),
});

export type MediaThumbnailMessage = z.infer<typeof mediaThumbnailMessageSchema>;
