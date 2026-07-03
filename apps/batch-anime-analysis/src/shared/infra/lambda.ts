// やること: Lambda バッチ実行で共有するイベントと実行結果の型を提供する
// やらないこと: 個別ジョブ、機能ロジック、外部サービス固有の型を持つ

/** Lambda から受け取るバッチ起動イベント。 */
export interface LambdaEvent {
	job?: unknown;
	[key: string]: unknown;
}

export function getEventString(event: LambdaEvent, key: string): string {
	const value = event[key];
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(`event.${key} が設定されていません`);
	}
	return value.trim();
}

/** バッチジョブが Lambda ハンドラーへ返す共通レスポンス。 */
export interface BatchResponse {
	ok: true;
	job: string;
	details?: Record<string, unknown>;
}

/** Lambda イベントを受け取り、共通レスポンスを返すバッチジョブ関数。 */
export type BatchHandler = (event: LambdaEvent) => Promise<BatchResponse>;
