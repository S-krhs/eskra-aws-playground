// In scope: batch Lambda が受け取る起動イベントの外部入力 schema と型を提供する
// Out of scope: ジョブ名の許可判定、ジョブ解決、ジョブ本体の処理を行う
import { z } from "zod";

/** batch Lambda が受け取る起動イベント schema。job を trim と小文字化で正規化する。 */
export const batchEventSchema = z.object({
	job: z.string().trim().toLowerCase().min(1),
});

/** batch Lambda が受け取る起動イベント。 */
export type BatchEvent = z.infer<typeof batchEventSchema>;
