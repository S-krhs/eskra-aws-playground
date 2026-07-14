// In scope: batch Lambda が受け取る実行 context の外部入力 schema と型を提供する
// Out of scope: 起動イベントの検証、実行時設定の解決、ジョブ本体の処理を行う
import { z } from "zod";

/** batch Lambda が受け取る実行 context のうち、job が利用するプロパティの schema。 */
export const batchContextSchema = z.object({
	invokedFunctionArn: z.string().trim().min(1),
});

/** batch Lambda が受け取る実行 context。 */
export type BatchContext = z.infer<typeof batchContextSchema>;
