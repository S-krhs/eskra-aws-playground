// In scope: reading the config file into the environment and starting the process listening on 127.0.0.1
// Out of scope: route handling, building the UI, how it stays resident (systemd's job)
import { loadJsonConfigFile } from "@eskra-aws-playground/libs/config/json-config-file.js";
import { serve } from "@hono/node-server";
import { z } from "zod";
import { createApp } from "./app.js";

/** The listening port; failing to take it means an instance is already running. */
const DEFAULT_PORT = 7420;

// r2 is left unvalidated here — repositories owns what a credential has to look like
const configSchema = z.object({
	bucket: z.string().min(1),
	r2: z.unknown(),
	databaseUrl: z.string().min(1),
	syncFunctionName: z.string().min(1),
	awsRegion: z.string().min(1),
	port: z.number().int().min(1).max(65535).optional(),
});

// 1. Read and validate the config file. Its location comes from infra/local/ — the launcher and the
//    systemd unit both put it here — so there is no default path to fall back to. Every failure names
//    the field and the file's location and never the content: the file holds a key and a connection
//    string, and this goes to the console.
const config = await loadJsonConfigFile({
	envName: "MEDIA_LIBRARY_CONFIG",
	schema: configSchema,
}).catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});

// 2. Publish the connections as environment variables. Everything downstream contracts for one that
//    way — repositories for the DB and R2, the sync operation for the Lambda — so they are all set
//    before anything can reach for one.
process.env.DATABASE_URL = config.databaseUrl;
process.env.R2_CREDENTIALS = JSON.stringify(config.r2);
process.env.MEDIA_BUCKET = config.bucket;
process.env.MEDIA_SYNC_FUNCTION_NAME = config.syncFunctionName;
process.env.AWS_REGION = config.awsRegion;

// 3. Listen on the loopback interface only — this runs on the user's WSL, not on a network.
const port = config.port ?? DEFAULT_PORT;
const server = serve(
	{ fetch: createApp().fetch, hostname: "127.0.0.1", port },
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
