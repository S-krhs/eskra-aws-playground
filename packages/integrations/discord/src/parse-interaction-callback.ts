// In scope: Discord interaction body から deferred 応答用の callback 情報を取り出す
// Out of scope: interaction 本体の parse、署名検証、応答生成
import { z } from "zod";
import type { DiscordInteractionCallback } from "./discord-interaction.js";

const interactionCallbackSchema = z.object({
	application_id: z.string().regex(/^\d{1,20}$/),
	token: z.string().min(1),
});

/**
 * JSON body から deferred 応答用の callback 情報(application_id・token)を取り出す。
 * どちらかが欠けている場合は undefined を返す。
 */
export const parseInteractionCallback = (
	rawBody: string,
): DiscordInteractionCallback | undefined => {
	let json: unknown;
	try {
		json = JSON.parse(rawBody) as unknown;
	} catch {
		return undefined;
	}

	const parsed = interactionCallbackSchema.safeParse(json);
	if (!parsed.success) {
		return undefined;
	}

	return {
		applicationId: parsed.data.application_id,
		token: parsed.data.token,
	};
};
