// In scope: the OpenAPI definitions of the sync routes — their responses and status codes
// Out of scope: the handling itself, invoking Lambda, reading the run record
import { syncStatusResponseSchema } from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import { createRoute } from "@hono/zod-openapi";
import { serverErrorResponse } from "../_shared/responses/error-response.js";

export const startSyncRoute = createRoute({
	method: "post",
	path: "/sync",
	operationId: "startSync",
	summary: "同期の起動を依頼する",
	responses: {
		202: {
			// Nothing to say beyond having accepted it: a body here could only repeat the status code
			description: "起動を受け付けた。完了は /sync/status を読んで確かめる",
		},
		500: serverErrorResponse,
	},
});

export const readSyncStatusRoute = createRoute({
	method: "get",
	path: "/sync/status",
	operationId: "readSyncStatus",
	summary: "直近の実行と、実行中があればその進捗を返す",
	responses: {
		200: {
			description: "直近の実行と、実行中があればその進捗",
			content: { "application/json": { schema: syncStatusResponseSchema } },
		},
		500: serverErrorResponse,
	},
});
