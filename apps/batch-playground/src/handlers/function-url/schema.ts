// In scope: Function URL Lambda の起動イベント・interaction body の外部入力 schema と型、HTTP レスポンスの型を提供する
// Out of scope: 署名検証、選択結果の判定、応答 body の組み立てを行う
import { z } from "zod";

/** Function URL Lambda が受け取る Lambda Function URL イベント schema。 */
export const discordInteractionFunctionUrlEventSchema = z.object({
	headers: z.record(z.string(), z.string()),
	body: z.string().optional(),
	isBase64Encoded: z.boolean().optional(),
});

/** Function URL Lambda が受け取る Lambda Function URL イベント。 */
export type DiscordInteractionFunctionUrlEvent = z.infer<
	typeof discordInteractionFunctionUrlEventSchema
>;

/** リクエストの生 body をパースした Discord interaction schema。 */
export const discordInteractionSchema = z.object({
	type: z.number(),
	data: z
		.object({
			custom_id: z.string().optional(),
		})
		.optional(),
	member: z
		.object({
			user: z
				.object({
					id: z.string(),
				})
				.optional(),
		})
		.optional(),
	user: z
		.object({
			id: z.string(),
		})
		.optional(),
});

/** リクエストの生 body をパースした Discord interaction。 */
export type DiscordInteraction = z.infer<typeof discordInteractionSchema>;

/** Function URL Lambda が Lambda Function URL へ返す HTTP レスポンス。 */
export interface DiscordInteractionResponse {
	statusCode: number;
	headers: Record<string, string>;
	body: string;
}
