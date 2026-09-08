// In scope: the OpenAPI definitions of the media routes — their requests, responses and status codes
// Out of scope: the handling itself, DB queries, storage access
import {
	mediaIdParamSchema,
	mediaListQuerySchema,
	mediaListResponseSchema,
} from "@eskra-aws-playground/shared-domains/media/library-api.js";
import { createRoute, z } from "@hono/zod-openapi";
import { errorResponseSchema } from "../_shared/responses/error-response.js";

export const listMediaRoute = createRoute({
	method: "get",
	path: "/media",
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

export const getThumbnailRoute = createRoute({
	method: "get",
	path: "/media/{id}/thumbnail",
	operationId: "getThumbnail",
	summary: "メディア 1 件のサムネイル画像を返す",
	request: { params: mediaIdParamSchema },
	responses: {
		200: {
			description: "サムネイルの webp 画像",
			// The screen reaches this through an <img> src rather than the generated client
			content: {
				"image/webp": { schema: z.string().openapi({ format: "binary" }) },
			},
		},
		400: {
			description: "id が UUID ではない",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		404: {
			description: "サムネイルがまだ生成されていない",
			content: { "application/json": { schema: errorResponseSchema } },
		},
	},
});
