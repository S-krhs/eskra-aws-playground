// In scope: building the callback payload answering a Discord PING interaction
// Out of scope: routing by interaction type, shaping the HTTP response
import {
	type DiscordPongResponsePayload,
	responseTypes,
} from "@eskra-aws-playground/integration-discord/interaction-response.js";
import type { OperationResult } from "@/handlers/routes/intermediate-models/operation-result.js";

/** Builds the PONG callback payload for a Discord PING interaction. */
export const pingOperation =
	(): OperationResult<DiscordPongResponsePayload> => {
		return {
			kind: "OK",
			data: { type: responseTypes.pong },
		};
	};
