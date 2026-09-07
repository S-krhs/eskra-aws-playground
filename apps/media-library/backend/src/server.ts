// In scope: 設定を読んで 127.0.0.1 で待ち受けるプロセスの起動
// Out of scope: route の実装、画面のビルド、常駐のしかた(systemd 側の担当)

import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadLibrarySettings } from "./shared/library-settings.js";

const settings = await loadLibrarySettings().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});

// repositories は接続先を DATABASE_URL から読むため、route が動く前に入れる
process.env.DATABASE_URL = settings.databaseUrl;

const app = createApp();

const server = serve(
	{ fetch: app.fetch, hostname: "127.0.0.1", port: settings.port },
	(info) => {
		console.log(`[media-library] http://127.0.0.1:${info.port} で待ち受けます`);
	},
);

server.on("error", (error: NodeJS.ErrnoException) => {
	if (error.code === "EADDRINUSE") {
		console.error(
			`[media-library] ポート ${settings.port} は使用中です。既に起動しているとみなして終了します。`,
		);
		process.exit(0);
	}

	console.error("[media-library] 待ち受けに失敗しました", error);
	process.exit(1);
});
