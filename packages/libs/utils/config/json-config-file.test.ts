import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { loadJsonConfigFile } from "./json-config-file.js";

const CONFIG_ENV = "JSON_CONFIG_FILE_TEST";

const schema = z.object({
	bucket: z.string().min(1),
	nested: z.object({ token: z.string().min(1) }),
});

let configDir: string;
let configPath: string;

const load = async (): Promise<z.infer<typeof schema>> => {
	return loadJsonConfigFile({ envName: CONFIG_ENV, schema });
};

beforeEach(async () => {
	configDir = await mkdtemp(join(tmpdir(), "json-config-file-"));
	configPath = join(configDir, "config.json");
	process.env[CONFIG_ENV] = configPath;
});

afterEach(async () => {
	delete process.env[CONFIG_ENV];
	await rm(configDir, { recursive: true, force: true });
});

describe("loadJsonConfigFile", () => {
	// Several tools read one file, so each takes only the fields its own schema names
	it("returns the fields the schema names and drops the rest", async () => {
		await writeFile(
			configPath,
			JSON.stringify({
				bucket: "media",
				nested: { token: "value" },
				other: "unused",
			}),
			"utf8",
		);

		await expect(load()).resolves.toEqual({
			bucket: "media",
			nested: { token: "value" },
		});
	});

	it("fails naming the variable when it is not set", async () => {
		delete process.env[CONFIG_ENV];

		await expect(load()).rejects.toThrow(
			/JSON_CONFIG_FILE_TEST が設定されていません/,
		);
	});

	it("fails naming the location when the file is missing", async () => {
		await expect(load()).rejects.toThrow(/設定ファイルを読めませんでした/);
	});

	it("fails naming the location when the JSON is broken", async () => {
		await writeFile(configPath, "{", "utf8");

		await expect(load()).rejects.toThrow(/JSON として不正です/);
	});

	// The file holds credentials and this error goes to the console the user is looking at
	it("names the nested field that failed, never the values", async () => {
		await writeFile(
			configPath,
			JSON.stringify({ bucket: "eskra-media-library", nested: { token: "" } }),
			"utf8",
		);

		const error = await load().catch((cause: unknown) => {
			return cause;
		});
		expect(String(error)).toMatch(/nested\.token/);
		expect(String(error)).not.toMatch(/eskra-media-library/);
	});
});
