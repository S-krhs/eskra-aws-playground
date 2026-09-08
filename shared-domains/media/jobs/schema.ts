// In scope: the media library's job names, and the wire schema for the thumbnail job's message
// Out of scope: job implementation, SQS send/receive, routing
import { z } from "zod";

/** The trigger side (scheduler / media-library) and the receiving side (batch / sqs-worker) are separate apps, so the name is decided only here. */
export const mediaJobNames = {
	mediaSync: "media-sync",
	mediaThumbnail: "media-thumbnail",
} as const;

/** One thumbnail-generation request — carries only what's needed to locate the source. */
export const mediaThumbnailMessageSchema = z.object({
	job: z.literal(mediaJobNames.mediaThumbnail),
	mediaId: z.uuid(),
	objectKey: z.string().min(1),
});

export type MediaThumbnailMessage = z.infer<typeof mediaThumbnailMessageSchema>;

/**
 * How many times SQS delivers a thumbnail request before the DLQ takes it.
 * The queue's redrive policy and the job's give-up point both read this, so they can't drift apart.
 */
export const MEDIA_THUMBNAIL_MAX_RECEIVE_COUNT = 3;
