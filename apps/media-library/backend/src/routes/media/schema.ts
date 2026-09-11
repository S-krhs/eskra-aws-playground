// In scope: the OpenAPI definitions of the media routes — their requests, responses and status codes
// Out of scope: the handling itself, DB queries, storage access
import {
	mediaFileQuerySchema,
	mediaIdParamSchema,
	mediaListQuerySchema,
	mediaListResponseSchema,
} from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import { createRoute, z } from "@hono/zod-openapi";
import {
	errorResponseSchema,
	serverErrorResponse,
} from "../_shared/responses/error-response.js";

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
		500: serverErrorResponse,
	},
});

export const getThumbnailRoute = createRoute({
	method: "get",
	path: "/media/{id}/thumbnail",
	operationId: "getThumbnail",
	summary: "メディア 1 件のサムネイル画像を返す",
	// The screen reaches this through an <img> src, so the tag is what keeps it out of the generated
	// client — orval filters endpoints by tag and by nothing else
	tags: ["thumbnail"],
	request: { params: mediaIdParamSchema },
	responses: {
		200: {
			description: "サムネイルの webp 画像",
			content: {
				"image/webp": { schema: z.string().openapi({ format: "binary" }) },
			},
		},
		304: {
			description: "If-None-Match が今の ETag と一致し、中身が変わっていない",
		},
		400: {
			description: "id が UUID ではない",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		404: {
			description: "サムネイルがまだ生成されていない",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		500: serverErrorResponse,
	},
});

export const getMediaFileRoute = createRoute({
	method: "get",
	path: "/media/{id}/file",
	operationId: "getMediaFile",
	summary: "メディア 1 件の原本を返す",
	// The screen reaches this through an <img>/<video> src and an <a href>, so it stays out of the
	// generated client the same way the thumbnail does — orval selects by tag and by nothing else
	tags: ["file"],
	request: { params: mediaIdParamSchema, query: mediaFileQuerySchema },
	responses: {
		200: {
			description: "原本の全体",
			content: {
				"application/octet-stream": {
					schema: z.string().openapi({ format: "binary" }),
				},
			},
		},
		206: {
			description: "Range で求められた範囲。動画のシークがこれを使う",
			content: {
				"application/octet-stream": {
					schema: z.string().openapi({ format: "binary" }),
				},
			},
		},
		304: {
			description: "If-None-Match が今の ETag と一致し、中身が変わっていない",
		},
		400: {
			description: "id が UUID ではない、または download の値が不正",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		404: {
			description: "そのメディアがない、またはゴミ箱に入っている",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		500: serverErrorResponse,
	},
});

export const trashMediaRoute = createRoute({
	method: "post",
	path: "/media/{id}/trash",
	operationId: "trashMedia",
	summary: "メディアをゴミ箱に入れる",
	request: { params: mediaIdParamSchema },
	responses: {
		204: {
			// Nothing to report: the caller knows which media it asked about, and the listing is where
			// the new state is read from
			description: "ゴミ箱に入れた。R2 の実体はそのまま残る",
		},
		400: {
			description: "id が UUID ではない",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		404: {
			description: "そのメディアがない",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		500: serverErrorResponse,
	},
});

export const restoreMediaRoute = createRoute({
	method: "post",
	path: "/media/{id}/restore",
	operationId: "restoreMedia",
	summary: "メディアをゴミ箱から戻す",
	request: { params: mediaIdParamSchema },
	responses: {
		204: {
			description: "ゴミ箱から戻した",
		},
		400: {
			description: "id が UUID ではない",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		404: {
			description: "そのメディアがない",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		500: serverErrorResponse,
	},
});

export const copyMediaToClipboardRoute = createRoute({
	method: "post",
	path: "/media/{id}/clipboard",
	operationId: "copyMediaToClipboard",
	summary: "メディアをファイルとしてクリップボードへ置く",
	request: { params: mediaIdParamSchema },
	responses: {
		204: {
			description: "クリップボードへ置いた。貼り付けるとファイルとして出る",
		},
		400: {
			description: "id が UUID ではない",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		404: {
			description: "そのメディアがない、またはゴミ箱に入っている",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		500: serverErrorResponse,
	},
});
