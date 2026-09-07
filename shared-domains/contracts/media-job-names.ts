// In scope: the one place listing media library job names
// Out of scope: job implementation, building an SQS message, routing

/** The trigger side (scheduler / media-library) and the receiving side (batch / sqs-worker) are separate apps, so the name is decided only here. */
export const mediaJobNames = {
	mediaSync: "media-sync",
	mediaThumbnail: "media-thumbnail",
} as const;
