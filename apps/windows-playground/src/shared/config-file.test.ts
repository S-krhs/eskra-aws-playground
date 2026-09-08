import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MEDIA_LIBRARY_CONFIG_ENV } from "@eskra-aws-playground/shared-domains/contracts/media-library-config.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfigFile } from "./config-file.js";

const validConfig = {
	bucket: "eskra-media-library",
	r2: {
		accountId: "account",
		accessKeyId: "access-key",
		secretAccessKey: "secret-key",
	},
};

let configDir: string;
let configPath: string;

const writeConfig = async (config: unknown): Promise<void> => {
	await writeFile(configPath, JSON.stringify(config), "utf8");
};

beforeEach(async () => {
	configDir = await mkdtemp(join(tmpdir(), "media-upload-config-"));
	configPath = join(configDir, "config.json");
	process.env[MEDIA_LIBRARY_CONFIG_ENV] = configPath;
});

afterEach(async () => {
	delete process.env[MEDIA_LIBRARY_CONFIG_ENV];
	await rm(configDir, { recursive: true, force: true });
});

describe("loadConfigFile", () => {
	// The uploader reads the same file as the management tool, and takes only the fields it needs
	it("takes the bucket and the credentials out of the shared config file", async () => {
		await writeConfig({ ...validConfig, databaseUrl: "postgresql://example" });

		const config = await loadConfigFile();
		expect(config.bucket).toBe("eskra-media-library");
		expect(config.r2).toEqual(validConfig.r2);
	});

	it("fails naming the location when the config file is missing", async () => {
		await expect(loadConfigFile()).rejects.toThrow(
			/設定ファイルを読めませんでした/,
		);
	});

	it("fails naming the location when the JSON is broken", async () => {
		await writeFile(configPath, "{", "utf8");

		await expect(loadConfigFile()).rejects.toThrow(/JSON として不正です/);
	});

	// A key carried on the error would flow straight into the console the user is looking at
	it("names only the missing fields, never the values", async () => {
		await writeConfig({ r2: validConfig.r2 });

		const error = await loadConfigFile().catch((cause: unknown) => {
			return cause;
		});
		expect(String(error)).toMatch(/bucket/);
		expect(String(error)).not.toMatch(/secret-key/);
	});
});
