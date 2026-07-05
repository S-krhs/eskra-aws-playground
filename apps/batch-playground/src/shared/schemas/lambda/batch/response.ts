// In scope: batch Lambda が返す共通レスポンスの型を提供する
// Out of scope: 起動イベントの検証、ジョブ解決、ジョブ本体の処理を行う

/** バッチジョブが batch Lambda ハンドラーへ返す共通レスポンス。 */
export interface BatchResponse {
	ok: true;
	job: string;
	details?: Record<string, unknown>;
}
