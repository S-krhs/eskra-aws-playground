// In scope: reading the config into the environment and starting the process listening on 127.0.0.1
// Out of scope: route implementation, building the UI, how it stays resident (systemd's job)

import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { DEFAULT_PORT, loadConfigFile } from "./shared/config-file.js";

const config = await loadConfigFile().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});

// Everything downstream contracts its connection as an environment variable — repositories for the DB
// and R2, the sync trigger for the Lambda — so they are all set before anything can reach for one
process.env.DATABASE_URL = config.databaseUrl;
process.env.R2_CREDENTIALS = JSON.stringify(config.r2);
process.env.MEDIA_BUCKET = config.bucket;
process.env.MEDIA_SYNC_FUNCTION_NAME = config.syncFunctionName;
process.env.AWS_REGION = config.awsRegion;

const port = config.port ?? DEFAULT_PORT;
const app = createApp();

const server = serve(
	{ fetch: app.fetch, hostname: "127.0.0.1", port },
	(info) => {
		console.log(`[media-library] http://127.0.0.1:${info.port} で待ち受けます`);
	},
);

server.on("error", (error: NodeJS.ErrnoException) => {
	if (error.code === "EADDRINUSE") {
		console.error(
			`[media-library] ポート ${port} は使用中です。既に起動しているとみなして終了します。`,
		);
		process.exit(0);
	}

	console.error("[media-library] 待ち受けに失敗しました", error);
	process.exit(1);
});
