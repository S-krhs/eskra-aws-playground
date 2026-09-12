// In scope: the OpenAPI definition of the tag route — its response and status codes
// Out of scope: the handling itself, DB access, how the screen uses the tags
import { tagListResponseSchema } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import { createRoute } from "@hono/zod-openapi";
import { serverErrorResponse } from "../_shared/responses/error-response.js";

export const listTagsRoute = createRoute({
	method: "get",
	path: "/tags",
	operationId: "listTags",
	summary: "使われているタグを名前順に返す",
	responses: {
		200: {
			description: "使われているタグ",
			content: { "application/json": { schema: tagListResponseSchema } },
		},
		500: serverErrorResponse,
	},
});
