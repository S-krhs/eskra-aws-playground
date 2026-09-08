// In scope: extracting deferred-response callback info from a Discord interaction body
// Out of scope: parsing the interaction itself, signature verification, building a response
import { z } from "zod";
import type { DiscordInteractionCallback } from "./discord-interaction.js";

const interactionCallbackSchema = z.object({
	application_id: z.string().regex(/^\d{1,20}$/),
	token: z.string().min(1),
});

/** Returns undefined if the JSON is unparseable or either field is missing. */
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
