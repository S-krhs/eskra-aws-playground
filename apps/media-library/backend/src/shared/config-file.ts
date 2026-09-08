// In scope: locating the config file this tool reads, and validating its fields
// Out of scope: deciding what the values are used for, connecting anywhere, creating the file
import { readFile } from "node:fs/promises";
import { resolveMediaLibraryConfigPath } from "@eskra-aws-playground/shared-domains/contracts/media-library-config.js";
import { z } from "zod";

/** The listening port; failing to take it means an instance is already running. */
export const DEFAULT_PORT = 7420;

// r2 is left unvalidated here — repositories owns what a credential has to look like
const configSchema = z.object({
	bucket: z.string().min(1),
	r2: z.unknown(),
	databaseUrl: z.string().min(1),
	syncFunctionName: z.string().min(1),
	awsRegion: z.string().min(1),
	port: z.number().int().min(1).max(65535).optional(),
});

export type MediaLibraryConfig = z.infer<typeof configSchema>;

/**
 * Reads and validates the config file.
 * A failure names the field and the file's location, and never the content — the file holds a key
 * and a connection string, and this error goes straight to the console.
 */
export const loadConfigFile = async (): Promise<MediaLibraryConfig> => {
	const configPath = resolveMediaLibraryConfigPath();
	let raw: string;

	try {
		raw = await readFile(configPath, "utf8");
	} catch {
		throw new Error(`設定ファイルを読めませんでした: ${configPath}`);
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`設定ファイルが JSON として不正です: ${configPath}`);
	}

	const result = configSchema.safeParse(parsed);

	if (!result.success) {
		const fields = result.error.issues
			.map((issue) => {
				return issue.path.join(".");
			})
			.join(", ");

		throw new Error(`設定ファイルの項目が不正です(${fields}): ${configPath}`);
	}

	return result.data;
};
