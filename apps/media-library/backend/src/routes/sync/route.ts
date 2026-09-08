// In scope: dispatching the sync routes and shaping each operation's result into a response
// Out of scope: invoking Lambda, reading the run record, running the sync
import { Hono } from "hono";
import { readSyncStatusOperation } from "./operations/read-sync-status-operation.js";
import { startSyncOperation } from "./operations/start-sync-operation.js";

export const syncRoute = new Hono()
	.post("/", async (c) => {
		await startSyncOperation();

		// The Lambda isn't waited on; progress is read from /status
		return c.json({ started: true }, 202);
	})
	.get("/status", async (c) => {
		return c.json(await readSyncStatusOperation(), 200);
	});
