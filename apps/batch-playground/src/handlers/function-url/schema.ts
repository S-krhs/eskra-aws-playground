// In scope: Function URL Lambda の起動イベント・interaction body の外部入力 schema と型、HTTP レスポンスの型を提供する
// Out of scope: 署名検証、選択結果の判定、応答 body の組み立てを行う
import { z } from "zod";

/** Function URL Lambda が受け取る Lambda Function URL イベント schema。rawPath で route を振り分ける。 */
export const functionUrlEventSchema = z.object({
	rawPath: z.string(),
	headers: z.record(z.string(), z.string()),
	body: z.string().optional(),
	isBase64Encoded: z.boolean().optional(),
});

/** Function URL Lambda が受け取る Lambda Function URL イベント。 */
export type FunctionUrlEvent = z.infer<typeof functionUrlEventSchema>;

/** Function URL Lambda が Lambda Function URL へ返す HTTP レスポンス。 */
export interface FunctionUrlResponse {
	statusCode: number;
	headers: Record<string, string>;
	body: string;
}
