// In scope: Function URL eventから署名検証用の値とparse済みinteractionを取り出す
// Out of scope: 署名検証、operation選択、response body生成
import { z } from "zod";
import {
	parseInteraction,
	parseInteractionCallback,
} from "@/external-protocols/discord-message/parse.js";

/** Function URL eventからDiscord署名検証用requestとinteractionを取り出すschema。 */
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
		return {
			...request,
			interaction,
			callback: parseInteractionCallback(request.rawBody),
		};
	});
