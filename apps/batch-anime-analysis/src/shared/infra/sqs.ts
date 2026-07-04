// In scope: SQS message 送信を行う
// Out of scope: 個別 job の message 形式や Lambda イベント解釈を持つ
import {
	SendMessageBatchCommand,
	type SendMessageBatchRequestEntry,
	SQSClient,
} from "@aws-sdk/client-sqs";

/** SQS へ送信する message の最小入力。 */
export interface SqsMessageInput {
	id: string;
	body: unknown;
}

const maxBatchSize = 10;

/** AWS SDK を使って SQS message を batch 送信する adapter。 */
export class AwsSqsMessageSender {
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
