// In scope: pulling the bearer token out of a Function URL event
// Out of scope: checking the token against the expected one, asking for the sync, the response body
import { z } from "zod";

const bearerPrefix = "Bearer ";

/**
 * Pulls the presented bearer token out of a Function URL event. A request with no usable
 * Authorization header yields an empty token rather than failing here, so every caller goes through
 * the same comparison and an absent header can't be told apart from a wrong one by timing.
 */
export const mediaSyncRequestSchema = z
	.object({
		headers: z.record(z.string(), z.string()),
	})
	.transform(({ headers }) => {
		const authorization = headers.authorization ?? "";

		return {
			presentedToken: authorization.startsWith(bearerPrefix)
				? authorization.slice(bearerPrefix.length)
				: "",
		};
	});
