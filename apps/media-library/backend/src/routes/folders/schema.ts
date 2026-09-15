// In scope: the OpenAPI definition of the folder route — its request, response and status codes
// Out of scope: the handling itself, DB access, moving media between folders
import {
	folderListQuerySchema,
	folderListResponseSchema,
} from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import { createRoute } from "@hono/zod-openapi";
import {
	errorResponseSchema,
	serverErrorResponse,
} from "../_shared/responses/error-response.js";

export const listFoldersRoute = createRoute({
	method: "get",
	path: "/folders",
	operationId: "listFolders",
	summary: "メディアを入れられるフォルダを名前順に返す",
	request: { query: folderListQuerySchema },
	responses: {
		200: {
			description:
				"ライブラリなら登録済みのフォルダと、メディアが実際に入っているフォルダ。アーカイブならメディアが入っているフォルダ",
			content: { "application/json": { schema: folderListResponseSchema } },
		},
		400: {
			description: "archived の値が不正",
			content: { "application/json": { schema: errorResponseSchema } },
		},
		500: serverErrorResponse,
	},
});
