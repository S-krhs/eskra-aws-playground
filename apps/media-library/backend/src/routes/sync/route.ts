// In scope: turning each sync operation's result into a response
// Out of scope: registering the routes, invoking Lambda, reading the run record
import type { RouteHandler } from "@hono/zod-openapi";
import { readSyncStatusOperation } from "./operations/read-sync-status-operation.js";
import { startSyncOperation } from "./operations/start-sync-operation.js";
import type { readSyncStatusRoute, startSyncRoute } from "./schema.js";

export const startSync: RouteHandler<typeof startSyncRoute> = async (c) => {
	// The Lambda isn't waited on and the operation has no outcome to report beyond having asked for
	// the run; progress is read from /sync/status
	await startSyncOperation();

	return c.body(null, 202);
};

export const readSyncStatus: RouteHandler<typeof readSyncStatusRoute> = async (
	c,
) => {
	const result = await readSyncStatusOperation();

	return c.json(result.data, 200);
};
