// In scope: アニメスクレイピング用 SQS message body の構築と検証を行う
// Out of scope: SQS 送受信、実行対象の決定、起動イベントの正規化を行う

/** Worker が処理する dataSource 単位のアニメスクレイピング要求。 */
export interface QueueMessage {
	dataSourceId: string;
}

/** dataSourceId ごとに SQS message を作る。 */
export const buildQueueMessages = (dataSourceIds: string[]): QueueMessage[] =>
	dataSourceIds.map((dataSourceId) => ({ dataSourceId }));

/** SQS message body をアニメスクレイピング用 message として検証する。 */
export const parseQueueMessage = (body: string): QueueMessage => {
	const message = JSON.parse(body) as QueueMessage;
	if (!message.dataSourceId) {
		throw new Error("SQS message body に dataSourceId がありません");
	}
	return message;
};
