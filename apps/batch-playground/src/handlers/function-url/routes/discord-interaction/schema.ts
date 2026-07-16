// In scope: Function URL event から署名検証用の値と parse 済み interaction を取り出す
// Out of scope: 署名検証、operation の選択、応答 body の生成
import { z } from "zod";

import { parseInteraction } from "../../../../external-protocols/discord-message/parse.js";

/** Function URL event から Discord 署名検証に必要な request 値と interaction を取り出す schema。 */
export const discordInteractionRequestSchema = z
	.object({
		headers: z.record(z.string(), z.string()),
		body: z.string().optional(),
		isBase64Encoded: z.boolean().optional(),
	})
	.transform(({ headers, body, isBase64Encoded }) => {
		return {
			signature: headers["x-signature-ed25519"] ?? "",
			timestamp: headers["x-signature-timestamp"] ?? "",
			rawBody: isBase64Encoded
				? Buffer.from(body ?? "", "base64").toString("utf8")
				: (body ?? ""),
		};
	})
	.transform((request, ctx) => {
		const interaction = parseInteraction(request.rawBody);
		if (!interaction) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "interaction body の形式が不正です。",
			});
			return z.NEVER;
		}

		return { ...request, interaction };
	});
