// In scope: the OpenAPI definition of the media listing — its request, responses and status codes
// Out of scope: the handling itself, DB queries, storage access, the thumbnail endpoint (it serves an image, not JSON)

import {
	mediaListQuerySchema,
	mediaListResponseSchema,
} from "@eskra-aws-playground/shared-domains/contracts/media-library-api.js";
import { createRoute } from "@hono/zod-openapi";
import { errorResponseSchema } from "../_shared/responses/error-response.js";

export const listMediaRoute = createRoute({
	method: "get",
	path: "/",
	operationId: "listMedia",
	summary: "メディアを絞り込んで 1 ページ分返す",
	request: { query: mediaListQuerySchema },
	responses: {
		200: {
			description: "絞り込み条件に合うメディアの 1 ページ",
			content: { "application/json": { schema: mediaListResponseSchema } },
		},
		400: {
			description: "query の項目が不正",
			content: { "application/json": { schema: errorResponseSchema } },
		},
	},
});
