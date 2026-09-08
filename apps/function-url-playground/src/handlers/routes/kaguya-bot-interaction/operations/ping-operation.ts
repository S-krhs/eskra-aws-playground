// In scope: building the callback payload answering a Discord PING interaction
// Out of scope: interaction routing, shaping the HTTP response
import {
	type DiscordPongResponsePayload,
	responseTypes,
} from "@eskra-aws-playground/integration-discord/interaction-response.js";
import type { OperationResult } from "@/handlers/routes/_shared/intermediate-models/operation-result.js";

export const pingOperation =
	(): OperationResult<DiscordPongResponsePayload> => {
		return { kind: "OK", data: { type: responseTypes.pong } };
	};
