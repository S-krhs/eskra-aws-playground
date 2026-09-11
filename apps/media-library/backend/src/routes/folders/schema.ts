// In scope: the OpenAPI definition of the folder route — its response and status codes
// Out of scope: the handling itself, DB access, moving media between folders
import { folderListResponseSchema } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import { createRoute } from "@hono/zod-openapi";
import { serverErrorResponse } from "../_shared/responses/error-response.js";

export const listFoldersRoute = createRoute({
	method: "get",
	path: "/folders",
	operationId: "listFolders",
	summary: "メディアを入れられるフォルダを名前順に返す",
	responses: {
		200: {
			description: "登録済みのフォルダと、メディアが実際に入っているフォルダ",
			content: { "application/json": { schema: folderListResponseSchema } },
		},
		500: serverErrorResponse,
	},
});
