// In scope: the one place naming the media library's jobs
// Out of scope: job implementation, the messages they carry, SQS send/receive, routing

/** The trigger side (scheduler / media-library) and the receiving side (batch / sqs-worker) are separate apps, so the name is decided only here. */
export const mediaJobNames = {
	mediaSync: "media-sync",
	mediaThumbnail: "media-thumbnail",
} as const;
