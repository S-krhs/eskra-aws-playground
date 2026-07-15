// In scope: batch Lambda の起動イベント・実行 context の外部入力 schema と型、共通レスポンスの型を提供する
// Out of scope: ジョブ名の許可判定、ジョブ解決、ジョブ本体の処理、実行時設定の解決を行う
import { z } from "zod";

/** batch Lambda が受け取る起動イベント schema。job を trim と小文字化で正規化する。 */
export const batchEventSchema = z.object({
	job: z.string().trim().toLowerCase().min(1),
});

/** batch Lambda が受け取る起動イベント。 */
export type BatchEvent = z.infer<typeof batchEventSchema>;

/** batch Lambda が受け取る実行 context のうち、job が利用するプロパティの schema。 */
export const batchContextSchema = z.object({
	invokedFunctionArn: z.string().trim().min(1),
});

/** batch Lambda が受け取る実行 context。 */
export type BatchContext = z.infer<typeof batchContextSchema>;

/** バッチジョブが batch Lambda ハンドラーへ返す共通レスポンス。 */
export interface BatchResponse {
	ok: true;
	job: string;
	details?: Record<string, unknown>;
}
