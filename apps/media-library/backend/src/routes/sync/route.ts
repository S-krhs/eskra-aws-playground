// In scope: turning each sync operation's result into a response
// Out of scope: registering the routes, invoking Lambda, reading the run record
import type { RouteHandler } from "@hono/zod-openapi";
import { readSyncStatusOperation } from "./operations/read-sync-status-operation.js";
import { startSyncOperation } from "./operations/start-sync-operation.js";
import type { readSyncStatusRoute, startSyncRoute } from "./schema.js";

export const startSync: RouteHandler<typeof startSyncRoute> = async (c) => {
	const result = await startSyncOperation();

	// The Lambda isn't waited on; progress is read from /sync/status
	return c.json(result.data, 202);
};

export const readSyncStatus: RouteHandler<typeof readSyncStatusRoute> = async (
	c,
) => {
	const result = await readSyncStatusOperation();

	return c.json(result.data, 200);
};
