// In scope: the OpenAPI definition of the tag route — its response and status codes
// Out of scope: the handling itself, DB access, how the screen uses the tags
import { tagUsageListResponseSchema } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import { createRoute } from "@hono/zod-openapi";
import { serverErrorResponse } from "../_shared/responses/error-response.js";

export const listTagsRoute = createRoute({
	method: "get",
	path: "/tags",
	operationId: "listTags",
	summary: "使われているタグを、付いているメディアの多い順に返す",
	responses: {
		200: {
			description: "使われているタグと、それが付いているメディアの件数",
			content: { "application/json": { schema: tagUsageListResponseSchema } },
		},
		500: serverErrorResponse,
	},
});
