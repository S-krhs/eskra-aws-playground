// In scope: the OpenAPI definition of the tag route — its request, response and status codes
// Out of scope: the handling itself, DB access, how the screen uses the tags
import {
	tagUsageListQuerySchema,
	tagUsageListResponseSchema,
} from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import { createRoute } from "@hono/zod-openapi";
import {
	errorResponseSchema,
	serverErrorResponse,
} from "../_shared/responses/error-response.js";

export const listTagsRoute = createRoute({
	method: "get",
	path: "/tags",
	operationId: "listTags",
	summary:
		"絞り込みに合うメディアに付いているタグを、付いている件数の多い順に返す",
	request: { query: tagUsageListQuerySchema },
	responses: {
		200: {
			description:
				"絞り込みに合うメディアに付いているタグと、そのうち何件に付いているか",
			content: { "application/json": { schema: tagUsageListResponseSchema } },
		},
		400: {
			description: "query の項目が不正",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		500: serverErrorResponse,
	},
});
