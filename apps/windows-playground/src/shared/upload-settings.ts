// In scope: locating and validating the config file the uploader reads
// Out of scope: talking to R2, key construction, creating the config file
import { readFile } from "node:fs/promises";
import {
	parseR2Credentials,
	type R2Credentials,
} from "@eskra-aws-playground/integration-r2/r2-client.js";
import { resolveMediaLibraryConfigPath } from "@eskra-aws-playground/shared-domains/contracts/media-library-config.js";
import { z } from "zod";

const settingsSchema = z.object({
	bucket: z.string().min(1),
	r2: z.unknown(),
});

export interface UploadSettings {
	credentials: R2Credentials;
	bucket: string;
}

/** A failure never puts the file's content on the error, so the key can't leak. */
export const loadUploadSettings = async (): Promise<UploadSettings> => {
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

	return {
		credentials: parseR2Credentials(result.data.r2),
		bucket: result.data.bucket,
	};
};
