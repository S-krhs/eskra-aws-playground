// In scope: building the callback payload answering a Discord autocomplete interaction
// Out of scope: routing by interaction type, searching for candidates, shaping the HTTP response
import {
	type DiscordEmptyAutocompleteResponsePayload,
	responseTypes,
} from "@eskra-aws-playground/integration-discord/interaction-response.js";
import type { OperationResult } from "@/handlers/routes/_shared/intermediate-models/operation-result.js";

export const autocompleteOperation =
	(): OperationResult<DiscordEmptyAutocompleteResponsePayload> => {
		return {
			kind: "OK",
			data: {
				type: responseTypes.autocomplete,
				data: { choices: [] },
			},
		};
	};
