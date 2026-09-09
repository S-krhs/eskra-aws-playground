// In scope: composing the API routes and the UI's static files into one Hono app
// Out of scope: individual route handling, starting the server, loading the config
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Hono } from "hono";
import { toInvalidRequestResponse } from "./routes/_shared/responses/error-response.js";
import { getThumbnail, listMedia } from "./routes/media/route.js";
import { getThumbnailRoute, listMediaRoute } from "./routes/media/schema.js";
import {
	readSyncStatus,
	readSyncStatusRoute,
	startSync,
	startSyncRoute,
} from "./routes/sync/route.js";

// serveStatic only resolves root relative to cwd, so it is rebuilt into a value independent of where the process started
const uiRoot = (): string => {
	const uiDir = join(
		dirname(fileURLToPath(import.meta.url)),
		"../../frontend/dist",
	);

	return relative(process.cwd(), uiDir) || ".";
};

/** Route definition to its handler; a new route gets registered here. */
const apiRoutes = new OpenAPIHono({
	// Without this, a request that fails a route's own schema comes back in zod's shape rather than ours
	defaultHook: (result, c) => {
		if (!result.success) {
			return c.json(toInvalidRequestResponse(result.error), 400);
		}
	},
})
	.openapi(listMediaRoute, listMedia)
	.openapi(getThumbnailRoute, getThumbnail)
	.openapi(startSyncRoute, startSync)
	.openapi(readSyncStatusRoute, readSyncStatus);

/** The document the frontend's client is generated from. Written to a file rather than served. */
export const buildOpenApiDocument = () => {
	return apiRoutes.getOpenAPI31Document({
		openapi: "3.1.0",
		info: { title: "media-library API", version: "1.0.0" },
		servers: [{ url: "/api" }],
	});
};

export const createApp = (): Hono => {
	const app = new Hono();

	app.onError((error, c) => {
		// Detail stays in the local log only, so a connection string or key can't reach the response
		console.error("[media-library] リクエストの処理に失敗しました", error);

		return c.json({ message: "リクエストの処理に失敗しました" }, 500);
	});

	app.route("/api", apiRoutes);

	// Without this, a path under /api that matched no route falls through to the UI below and the
	// caller gets index.html with a 200 instead of a failure it can read
	app.all("/api/*", (c) => {
		return c.json({ message: "その API はありません" }, 404);
	});

	const root = uiRoot();

	app.use("*", serveStatic({ root }));
	// The UI routes on the client, so everything left falls through to index.html
	app.get(
		"*",
		serveStatic({
			root,
			rewriteRequestPath: () => {
				return "/index.html";
			},
		}),
	);

	return app;
};
