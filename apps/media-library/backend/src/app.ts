// In scope: composing the API routes and the UI's static files into one Hono app
// Out of scope: individual route handling, what each guard checks, starting the server, loading the config
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { loopbackHostGuard } from "./loopback-host-guard.js";
import { toInvalidRequestResponse } from "./routes/_shared/responses/error-response.js";
import {
	copyMediaToClipboard,
	getMediaFile,
	getThumbnail,
	listMedia,
	replaceMediaTags,
	restoreMedia,
	trashMedia,
} from "./routes/media/route.js";
import {
	copyMediaToClipboardRoute,
	getMediaFileRoute,
	getThumbnailRoute,
	listMediaRoute,
	replaceMediaTagsRoute,
	restoreMediaRoute,
	trashMediaRoute,
} from "./routes/media/schema.js";
import { readSyncStatus, startSync } from "./routes/sync/route.js";
import { readSyncStatusRoute, startSyncRoute } from "./routes/sync/schema.js";
import { listTags } from "./routes/tags/route.js";
import { listTagsRoute } from "./routes/tags/schema.js";

// serveStatic joins this onto each request path, so an absolute one resolves the same wherever the
// process was started from
const uiRoot = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../frontend/dist",
);

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
	.openapi(getMediaFileRoute, getMediaFile)
	.openapi(trashMediaRoute, trashMedia)
	.openapi(restoreMediaRoute, restoreMedia)
	.openapi(copyMediaToClipboardRoute, copyMediaToClipboard)
	.openapi(replaceMediaTagsRoute, replaceMediaTags)
	.openapi(listTagsRoute, listTags)
	.openapi(startSyncRoute, startSync)
	.openapi(readSyncStatusRoute, readSyncStatus);

/** The document the frontend's client is generated from. Written to a file rather than served. */
export const buildOpenApiDocument = () => {
	return apiRoutes.getOpenAPI31Document({
		openapi: "3.1.0",
		info: {
			title: "media-library API",
			version: "1.0.0",
			// The two answers no route definition can carry: neither belongs to a path this document
			// lists, so they are stated here instead
			description:
				"この文書に無い /api 配下のパスは 404 を返します。UI 以外のオリジンからの POST は、ルートに届く前に 403 で拒否されます。",
		},
		servers: [{ url: "/api" }],
	});
};

export const createApp = (): Hono => {
	const app = new Hono();

	app.onError((error, c) => {
		// A guard already decided what to answer with; only an unhandled failure becomes a 500
		if (error instanceof HTTPException) {
			return error.getResponse();
		}

		// Detail stays in the local log only, so a connection string or key can't reach the response
		console.error("[media-library] リクエストの処理に失敗しました", error);

		return c.json({ message: "リクエストの処理に失敗しました" }, 500);
	});

	// This listens on the loopback interface, which any site the user has open can reach as well.
	// The host check turns away a name pointed at 127.0.0.1 from outside, and csrf() turns away a
	// state-changing request that didn't come from the UI's own origin — including one sent without a
	// preflight, which is how a cross-site POST would arrive.
	app.use("*", loopbackHostGuard);
	app.use("*", csrf());

	app.route("/api", apiRoutes);

	// Without this, a path under /api that matched no route falls through to the UI below and the
	// caller gets index.html with a 200 instead of a failure it can read
	app.all("/api/*", (c) => {
		return c.json({ message: "その API はありません" }, 404);
	});

	app.use("*", serveStatic({ root: uiRoot }));
	// The UI routes on the client, so everything left falls through to index.html
	app.get(
		"*",
		serveStatic({
			root: uiRoot,
			rewriteRequestPath: () => {
				return "/index.html";
			},
		}),
	);

	return app;
};
