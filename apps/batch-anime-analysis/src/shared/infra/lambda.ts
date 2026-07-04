// In scope: Lambda バッチ実行で共有するイベントと実行結果の型を提供する
// Out of scope: 個別ジョブ、機能ロジック、外部サービス固有の型を持つ

/** Lambda から受け取るバッチ起動イベント。 */
export interface LambdaEvent {
	job?: unknown;
	[key: string]: unknown;
}

/** バッチジョブが Lambda ハンドラーへ返す共通レスポンス。 */
export interface BatchResponse {
	ok: true;
	job: string;
	details?: Record<string, unknown>;
}

/** Lambda イベントを受け取り、共通レスポンスを返すバッチジョブ関数。 */
export type BatchHandler = (event: LambdaEvent) => Promise<BatchResponse>;

/** Lambda SQS event のうち、この app が処理に使う record 入力。 */
export interface SqsRecord {
	messageId: string;
	body: string;
}

/** Lambda SQS event のうち、この app が処理に使う batch 入力。 */
export interface SqsBatchEvent {
	Records: SqsRecord[];
}

/** SQS partial batch response に載せる、処理に失敗した record。 */
export interface SqsBatchItemFailure {
	itemIdentifier: string;
}

/** SQS partial batch response として Lambda に返す処理結果。 */
export interface SqsBatchResponse {
	batchItemFailures: SqsBatchItemFailure[];
}

/** SQS event を受け取り、partial batch response を返す Lambda job 関数。 */
export type SqsBatchHandler = (
	event: SqsBatchEvent,
) => Promise<SqsBatchResponse>;
