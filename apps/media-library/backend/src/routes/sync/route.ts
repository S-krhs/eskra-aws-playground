// In scope: dispatching the sync routes and shaping each operation's result into a response
// Out of scope: invoking Lambda, reading the run record, running the sync
import { OpenAPIHono } from "@hono/zod-openapi";
import { readSyncStatusOperation } from "./operations/read-sync-status-operation.js";
import { startSyncOperation } from "./operations/start-sync-operation.js";
import { readSyncStatusRoute, startSyncRoute } from "./schema.js";

export const syncRoute = new OpenAPIHono()
	.openapi(startSyncRoute, async (c) => {
		await startSyncOperation();

		// The Lambda isn't waited on; progress is read from /status
		return c.json({ started: true }, 202);
	})
	.openapi(readSyncStatusRoute, async (c) => {
		return c.json(await readSyncStatusOperation(), 200);
	});
