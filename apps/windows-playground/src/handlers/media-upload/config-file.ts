// In scope: locating the config file this entry point reads at startup, and validating the fields it needs
// Out of scope: deciding what the values are used for, talking to R2, creating the file
import { readFile } from "node:fs/promises";
import { z } from "zod";

// r2 is left unvalidated here — repositories owns what a credential has to look like
const configSchema = z.object({
	bucket: z.string().min(1),
	r2: z.unknown(),
});

export type MediaUploadConfig = z.infer<typeof configSchema>;

/**
 * Reads and validates the fields the uploader needs out of the shared config file. The file's
 * location comes from infra/local/, which every launch route sets, so there is no default here.
 * A failure names the field and the file's location, and never the content — the file holds a key,
 * and this error goes straight to the console the user is looking at.
 */
export const loadConfigFile = async (): Promise<MediaUploadConfig> => {
	const configPath = process.env.MEDIA_LIBRARY_CONFIG;

	if (!configPath) {
		throw new Error(
			"MEDIA_LIBRARY_CONFIG が設定されていません。infra/local/run.mjs 経由で起動してください",
		);
	}

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
