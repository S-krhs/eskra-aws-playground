// In scope: pulling the signature-verification values and the parsed interaction out of a Function URL event
// Out of scope: verifying the signature, picking an operation, building the response body

import { parseInteraction } from "@eskra-aws-playground/integration-discord/parse-interaction.js";
import { parseInteractionCallback } from "@eskra-aws-playground/integration-discord/parse-interaction-callback.js";
import { z } from "zod";

/** Pulls the request values Discord signature verification needs, plus the interaction, out of a Function URL event. */
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
