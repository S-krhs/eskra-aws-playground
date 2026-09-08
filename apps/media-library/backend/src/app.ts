// In scope: composing the API routes and the UI's static files into one Hono app
// Out of scope: individual route implementations, starting the server, loading the config
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { mediaRoute } from "./routes/media/route.js";
import { syncRoute } from "./routes/sync/route.js";

// serveStatic only resolves root relative to cwd, so it is rebuilt into a value independent of where the process started
const uiRoot = (): string => {
	const uiDir = join(
		dirname(fileURLToPath(import.meta.url)),
		"../../frontend/dist",
	);

	return relative(process.cwd(), uiDir) || ".";
};

/** Request path to owning route; a new route gets registered here. */
const apiRoutes = new Hono()
	.route("/media", mediaRoute)
	.route("/sync", syncRoute);

/** The API type the frontend derives response types from via hc(). */
export type ApiType = typeof apiRoutes;

export const createApp = (): Hono => {
	const app = new Hono();

	app.onError((error, c) => {
		// Detail stays in the local log only, so a connection string or key can't reach the response
		console.error("[media-library] リクエストの処理に失敗しました", error);

		return c.json({ message: "リクエストの処理に失敗しました" }, 500);
	});

	app.route("/api", apiRoutes);

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
