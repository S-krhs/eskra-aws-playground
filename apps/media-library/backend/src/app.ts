// In scope: API route と画面の静的ファイルを 1 つの Hono app にまとめる
// Out of scope: 個々の route の実装、server の起動、設定ファイルの読み込み
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { createMediaRoutes } from "./routes/media-routes.js";
import { createSyncRoutes } from "./routes/sync-routes.js";
import type { LibraryContext } from "./shared/library-context.js";

// serveStatic の root は cwd からの相対でしか解決されないため、起動場所に依らない値へ直す
const uiRoot = (): string => {
	const uiDir = join(
		dirname(fileURLToPath(import.meta.url)),
		"../../frontend/dist",
	);

	return relative(process.cwd(), uiDir) || ".";
};

const createApiRoutes = (context: LibraryContext) => {
	return new Hono()
		.route("/media", createMediaRoutes(context))
		.route("/sync", createSyncRoutes(context));
};

/** frontend が hc() でレスポンス型を導出するための API の型。 */
export type ApiType = ReturnType<typeof createApiRoutes>;

/** API と画面を配信する app を組み立てる。 */
export const createApp = (context: LibraryContext): Hono => {
	const app = new Hono();

	app.onError((error, c) => {
		// 接続文字列や鍵が応答へ混ざらないよう、詳細は手元のログにだけ残す
		console.error("[media-library] リクエストの処理に失敗しました", error);

		return c.json({ message: "リクエストの処理に失敗しました" }, 500);
	});

	app.route("/api", createApiRoutes(context));

	const root = uiRoot();

	app.use("*", serveStatic({ root }));
	// 画面はクライアント側で経路を持つため、残りは index.html へ落とす
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
