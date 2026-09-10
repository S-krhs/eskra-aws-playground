// In scope: the partial batch response type the worker Lambda (sqs-worker) returns
// Out of scope: validating the SQS event, interpreting a message body, per-record execution control

/** The SQS partial batch response; only the failed records go back for retry. */
export interface SqsWorkerResponse {
	batchItemFailures: {
		itemIdentifier: string;
	}[];
}
