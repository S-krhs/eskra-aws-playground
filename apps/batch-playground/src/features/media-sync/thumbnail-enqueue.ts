// In scope: enqueuing media with no thumbnail yet onto the generation job's queue
// Out of scope: resolving the queue URL and job name, generating a thumbnail, the sync's diffing
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { mediaObjectRepository } from "@eskra-aws-playground/repositories/media/media-object/repository.js";
import type { MediaThumbnailMessage } from "@eskra-aws-playground/shared-domains/contracts/media-thumbnail-message.js";

// The most one sync enqueues at a time.
// It keeps a large batch — a first run, say — from going out all at once; the rest waits for the next sync.
const ENQUEUE_LIMIT = 10_000;

// How many times thumbnail generation is attempted.
// Without a cap, media that keeps failing gets re-enqueued forever and leaves the DLQ full.
const MAX_ATTEMPTS = 3;

// How long after the last enqueue before the same media may go out again.
// It is set longer than SQS's own retries (a 6-minute visibility timeout, 3 times), so an in-flight message is never enqueued twice.
const RETRY_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Enqueues media with no thumbnail yet. The attempt count advances at enqueue time, which keeps
 * in-flight media and media that can't be generated from going out twice.
 */
export const enqueueMissingThumbnails = async (input: {
	queueUrl: string;
	job: MediaThumbnailMessage["job"];
	enqueuedAt: Date;
}): Promise<number> => {
	const targets = await mediaObjectRepository.findWithoutThumbnail({
		limit: ENQUEUE_LIMIT,
		maxAttempts: MAX_ATTEMPTS,
		retryBefore: new Date(input.enqueuedAt.getTime() - RETRY_INTERVAL_MS),
	});

	if (targets.length === 0) {
		return 0;
	}

	const sender = new SqsMessageSender(input.queueUrl);
	await sender.sendMessages(
		targets.map((target) => {
			return {
				id: target.id,
				body: {
					job: input.job,
					mediaId: target.id,
					objectKey: target.objectKey,
				} satisfies MediaThumbnailMessage,
			};
		}),
	);

	// Only what actually sent advances its attempt count; advancing first would burn retries on messages that never went out
	await mediaObjectRepository.markThumbnailEnqueued(
		targets.map((target) => {
			return target.id;
		}),
		input.enqueuedAt,
	);

	return targets.length;
};
