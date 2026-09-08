// In scope: the OpenAPI definitions of the sync routes and turning each operation's result into a response
// Out of scope: registering the routes, invoking Lambda, reading the run record
import {
	syncStartResponseSchema,
	syncStatusResponseSchema,
} from "@eskra-aws-playground/shared-domains/media/library-api/schema.js";
import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import { readSyncStatusOperation } from "./operations/read-sync-status-operation.js";
import { startSyncOperation } from "./operations/start-sync-operation.js";

export const startSyncRoute = createRoute({
	method: "post",
	path: "/sync",
	operationId: "startSync",
	summary: "同期の起動を依頼する",
	responses: {
		202: {
			description: "起動を受け付けた。完了は /sync/status を読んで確かめる",
			content: { "application/json": { schema: syncStartResponseSchema } },
		},
	},
});

export const startSync: RouteHandler<typeof startSyncRoute> = async (c) => {
	const result = await startSyncOperation();

	// The Lambda isn't waited on; progress is read from /sync/status
	return c.json(result.data, 202);
};

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
	},
});

export const readSyncStatus: RouteHandler<typeof readSyncStatusRoute> = async (
	c,
) => {
	const result = await readSyncStatusOperation();

	return c.json(result.data, 200);
};
