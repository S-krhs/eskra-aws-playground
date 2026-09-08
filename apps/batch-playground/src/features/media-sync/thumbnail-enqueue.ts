// In scope: putting thumbnail-generation requests on the queue
// Out of scope: deciding which media still needs one, generating a thumbnail, the sync's diffing
import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import type { MediaThumbnailMessage } from "@eskra-aws-playground/shared-domains/contracts/media-jobs.js";

// The most one sync sends at a time.
// It keeps a large batch — a first run, say — from going out all at once; whatever is left over is
// still sitting under the pending prefix, so the next sync picks it up
const ENQUEUE_LIMIT = 10_000;

/** One media object to have a thumbnail made for. */
export interface ThumbnailRequest {
	mediaId: string;
	objectKey: string;
}

/** Returns how many requests went out, which is capped well below a first run's backlog. */
export const enqueueThumbnailRequests = async (input: {
	queueUrl: string;
	job: MediaThumbnailMessage["job"];
	requests: ThumbnailRequest[];
}): Promise<number> => {
	const requests = input.requests.slice(0, ENQUEUE_LIMIT);

	if (requests.length === 0) {
		return 0;
	}

	const sender = new SqsMessageSender(input.queueUrl);
	await sender.sendMessages(
		requests.map((request) => {
			return {
				id: request.mediaId,
				body: {
					job: input.job,
					mediaId: request.mediaId,
					objectKey: request.objectKey,
				} satisfies MediaThumbnailMessage,
			};
		}),
	);

	return requests.length;
};
