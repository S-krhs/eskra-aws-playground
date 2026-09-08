// In scope: validating the config file this tool reads and assembling its connections and runtime settings
// Out of scope: talking to R2 or Lambda, connecting to the DB, creating the config file
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveMediaLibraryConfigPath } from "@eskra-aws-playground/shared-domains/contracts/media-library-config.js";
import { z } from "zod";

/** The listening port; failing to take it means an instance is already running. */
export const DEFAULT_PORT = 7420;

const DEFAULT_THUMBNAIL_CACHE_DIR = join(
	homedir(),
	".cache",
	"eskra-media-library",
	"thumbnails",
);

const settingsSchema = z.object({
	bucket: z.string().min(1),
	r2: z.unknown(),
	databaseUrl: z.string().min(1),
	syncFunctionName: z.string().min(1),
	awsRegion: z.string().min(1),
	thumbnailCacheDir: z.string().min(1).optional(),
	port: z.number().int().min(1).max(65535).optional(),
});

/** The connections and runtime settings this tool needs. `r2CredentialsJson` is handed to repositories through the environment, unread here. */
export interface LibrarySettings {
	r2CredentialsJson: string;
	bucket: string;
	databaseUrl: string;
	syncFunctionName: string;
	awsRegion: string;
	thumbnailCacheDir: string;
	port: number;
}

let settings: LibrarySettings | undefined;

/**
 * Reads the config file, assembles the connections, and keeps them at module scope.
 * A failure never puts the file's content on the error, so a key or connection string can't leak.
 */
export const loadLibrarySettings = async (): Promise<LibrarySettings> => {
	const settingsPath = resolveMediaLibraryConfigPath();
	let raw: string;

	try {
		raw = await readFile(settingsPath, "utf8");
	} catch {
		throw new Error(`設定ファイルを読めませんでした: ${settingsPath}`);
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`設定ファイルが JSON として不正です: ${settingsPath}`);
	}

	const result = settingsSchema.safeParse(parsed);

	if (!result.success) {
		const fields = result.error.issues
			.map((issue) => {
				return issue.path.join(".");
			})
			.join(", ");

		throw new Error(`設定ファイルの項目が不正です(${fields}): ${settingsPath}`);
	}

	settings = {
		r2CredentialsJson: JSON.stringify(result.data.r2),
		bucket: result.data.bucket,
		databaseUrl: result.data.databaseUrl,
		syncFunctionName: result.data.syncFunctionName,
		awsRegion: result.data.awsRegion,
		thumbnailCacheDir:
			result.data.thumbnailCacheDir ?? DEFAULT_THUMBNAIL_CACHE_DIR,
		port: result.data.port ?? DEFAULT_PORT,
	};

	return settings;
};

/** Returns the already-loaded connections; this is what a route reads. */
export const getLibrarySettings = (): LibrarySettings => {
	if (!settings) {
		throw new Error("設定ファイルを読み込む前に接続先を参照しました。");
	}

	return settings;
};
