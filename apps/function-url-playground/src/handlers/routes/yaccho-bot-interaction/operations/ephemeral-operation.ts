// In scope: building an ephemeral Discord interaction callback payload
// Out of scope: routing by interaction type, deciding the message content, shaping the HTTP response
import {
	type DiscordEphemeralResponsePayload,
	messageFlags,
	responseTypes,
} from "@eskra-aws-playground/integration-discord/interaction-response.js";
import type { OperationResult } from "@/handlers/routes/intermediate-models/operation-result.js";

/** Builds a Discord interaction callback payload visible only to the caller. */
export const ephemeralOperation = (
	content: string,
): OperationResult<DiscordEphemeralResponsePayload> => {
	return {
		kind: "OK",
		data: {
			type: responseTypes.message,
			data: {
				content,
				flags: messageFlags.ephemeral,
				allowed_mentions: { parse: [] },
			},
		},
	};
};
