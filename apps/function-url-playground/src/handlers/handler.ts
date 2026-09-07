// In scope: validating the envelope as the public Function URL endpoint and delegating by request path to the owning route
// Out of scope: signature verification, interpreting an interaction, the contents of a response payload
import { paths } from "./contracts/paths.js";
import { kaguyaBotInteractionRoute } from "./routes/kaguya-bot-interaction/route.js";
import { yacchoBotInteractionRoute } from "./routes/yaccho-bot-interaction/route.js";
import {
	type FunctionUrlEvent,
	type FunctionUrlResponse,
	functionUrlEventSchema,
} from "./schema.js";

type FunctionUrlRoute = (
	event: FunctionUrlEvent,
) => Promise<FunctionUrlResponse>;

/** Request path to owning route; a new route gets registered here (e.g. "/slack/events"). */
const routesByPath = new Map<string, FunctionUrlRoute>([
	[paths.yacchoBotInteraction, yacchoBotInteractionRoute],
	[paths.kaguyaBotInteraction, kaguyaBotInteractionRoute],
]);

/** The Lambda Function URL entry point; validates the envelope and delegates to the route for that path. */
export const handler = async (
	event: unknown = {},
): Promise<FunctionUrlResponse> => {
	const parsedEvent = functionUrlEventSchema.safeParse(event);

	if (!parsedEvent.success) {
		return {
			statusCode: 400,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ error: "リクエストの形式が不正です。" }),
		};
	}

	const route = routesByPath.get(parsedEvent.data.rawPath);

	if (!route) {
		return {
			statusCode: 404,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ error: "対応していないパスです。" }),
		};
	}

	return route(parsedEvent.data);
};
