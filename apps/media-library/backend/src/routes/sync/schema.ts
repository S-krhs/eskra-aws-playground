// In scope: the OpenAPI definitions of the sync routes — their responses and status codes
// Out of scope: the handling itself, invoking Lambda, reading the run record

import {
	syncStartResponseSchema,
	syncStatusResponseSchema,
} from "@eskra-aws-playground/shared-domains/media/library-api.js";
import { createRoute } from "@hono/zod-openapi";

export const startSyncRoute = createRoute({
	method: "post",
	path: "/",
	operationId: "startSync",
	summary: "同期の起動を依頼する",
	responses: {
		202: {
			description: "起動を受け付けた。完了は /status を読んで確かめる",
			content: { "application/json": { schema: syncStartResponseSchema } },
		},
	},
});

export const readSyncStatusRoute = createRoute({
	method: "get",
	path: "/status",
	operationId: "readSyncStatus",
	summary: "直近の実行と、実行中があればその進捗を返す",
	responses: {
		200: {
			description: "直近の実行と、実行中があればその進捗",
			content: { "application/json": { schema: syncStatusResponseSchema } },
		},
	},
});
