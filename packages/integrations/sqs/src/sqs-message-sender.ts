// In scope: batch-sending messages to SQS via the AWS SDK
// Out of scope: resolving the queue URL, a job's message shape, Lambda event parsing
import {
	SendMessageBatchCommand,
	type SendMessageBatchRequestEntry,
	SQSClient,
} from "@aws-sdk/client-sqs";

export interface SqsMessageInput {
	id: string;
	body: unknown;
}

const maxBatchSize = 10;

export class SqsMessageSender {
	private readonly client = new SQSClient({});

	public constructor(private readonly queueUrl: string) {}

	public async sendMessages(messages: SqsMessageInput[]): Promise<void> {
		for (let index = 0; index < messages.length; index += maxBatchSize) {
			const batch = messages.slice(index, index + maxBatchSize);
			await this.sendBatch(batch);
		}
	}

	private async sendBatch(messages: SqsMessageInput[]): Promise<void> {
		if (messages.length === 0) {
			return;
		}

		const entries: SendMessageBatchRequestEntry[] = messages.map((message) => {
			return {
				Id: message.id,
				MessageBody: JSON.stringify(message.body),
			};
		});

		const result = await this.client.send(
			new SendMessageBatchCommand({
				QueueUrl: this.queueUrl,
				Entries: entries,
			}),
		);

		if (result.Failed && result.Failed.length > 0) {
			const failedIds = result.Failed.map((failure) => {
				return failure.Id;
			}).join(", ");
			throw new Error(`SQS message の送信に失敗しました: ${failedIds}`);
		}
	}
}
