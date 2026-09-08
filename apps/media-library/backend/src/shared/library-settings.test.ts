import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MEDIA_LIBRARY_CONFIG_ENV } from "@eskra-aws-playground/shared-domains/contracts/media-library-config.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PORT, loadLibrarySettings } from "./library-settings.js";

const validConfig = {
	bucket: "eskra-media-library",
	r2: {
		accountId: "account",
		accessKeyId: "access-key",
		secretAccessKey: "secret-key",
	},
	databaseUrl: "postgresql://example/media",
	syncFunctionName: "media-sync",
	awsRegion: "ap-southeast-1",
};

let configDir: string;
let configPath: string;

const writeConfig = async (config: unknown): Promise<void> => {
	await writeFile(configPath, JSON.stringify(config), "utf8");
};

beforeEach(async () => {
	configDir = await mkdtemp(join(tmpdir(), "media-library-config-"));
	configPath = join(configDir, "config.json");
	process.env[MEDIA_LIBRARY_CONFIG_ENV] = configPath;
});

afterEach(async () => {
	delete process.env[MEDIA_LIBRARY_CONFIG_ENV];
	await rm(configDir, { recursive: true, force: true });
});

describe("loadLibrarySettings", () => {
	it("assembles the connections from the config file", async () => {
		await writeConfig(validConfig);

		const settings = await loadLibrarySettings();
		expect(settings.bucket).toBe("eskra-media-library");
		expect(JSON.parse(settings.r2CredentialsJson).accountId).toBe("account");
		expect(settings.syncFunctionName).toBe("media-sync");
	});

	it("fills an omitted field with its default", async () => {
		await writeConfig(validConfig);

		const settings = await loadLibrarySettings();
		expect(settings.port).toBe(DEFAULT_PORT);
		expect(settings.thumbnailCacheDir).toMatch(/eskra-media-library/);
	});

	it("fails naming the location when the config file is missing", async () => {
		await expect(loadLibrarySettings()).rejects.toThrow(
			/設定ファイルを読めませんでした/,
		);
	});

	it("fails naming the location when the JSON is broken", async () => {
		await writeFile(configPath, "{", "utf8");

		await expect(loadLibrarySettings()).rejects.toThrow(/JSON として不正です/);
	});

	// A connection string or key carried on the error would flow into the logs and the screen
	it("names only the missing fields, never the values", async () => {
		await writeConfig({ ...validConfig, databaseUrl: "" });

		await expect(loadLibrarySettings()).rejects.toThrow(/databaseUrl/);
	});
});
