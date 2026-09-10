// In scope: reading the JSON file an environment variable points at, and validating it with a caller's schema
// Out of scope: which fields a tool needs, what the values are used for, creating the file
import { readFile } from "node:fs/promises";
import type { z } from "zod";

export interface JsonConfigFileOptions<TSchema extends z.ZodType> {
	/** The variable holding the file's path. Unset is an error — there is no default path to fall back to. */
	envName: string;
	schema: TSchema;
}

/**
 * A failure names the variable, the file's location, and the fields that did not validate — never the
 * file's content. A config file tends to hold credentials, and this error goes straight to a console.
 */
export const loadJsonConfigFile = async <TSchema extends z.ZodType>({
	envName,
	schema,
}: JsonConfigFileOptions<TSchema>): Promise<z.infer<TSchema>> => {
	const configPath = process.env[envName];

	if (!configPath) {
		throw new Error(
			`${envName} が設定されていません。設定ファイルのパスを環境変数で渡して起動してください`,
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

	const result = schema.safeParse(parsed);

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
