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
	it("設定ファイルから接続先を組み立てる", async () => {
		await writeConfig(validConfig);

		const settings = await loadLibrarySettings();
		expect(settings.bucket).toBe("eskra-media-library");
		expect(settings.credentials.accountId).toBe("account");
		expect(settings.syncFunctionName).toBe("media-sync");
	});

	it("省略した項目は既定値で埋める", async () => {
		await writeConfig(validConfig);

		const settings = await loadLibrarySettings();
		expect(settings.port).toBe(DEFAULT_PORT);
		expect(settings.thumbnailCacheDir).toMatch(/eskra-media-library/);
	});

	it("設定ファイルが無ければ場所を示して落ちる", async () => {
		await expect(loadLibrarySettings()).rejects.toThrow(
			/設定ファイルを読めませんでした/,
		);
	});

	it("JSON として壊れていれば場所を示して落ちる", async () => {
		await writeFile(configPath, "{", "utf8");

		await expect(loadLibrarySettings()).rejects.toThrow(/JSON として不正です/);
	});

	// 接続文字列や鍵がそのままエラーへ乗ると、ログや画面へ流れる
	it("項目が足りなければ項目名だけを示し、値は載せない", async () => {
		await writeConfig({ ...validConfig, databaseUrl: "" });

		await expect(loadLibrarySettings()).rejects.toThrow(/databaseUrl/);
	});

	it("鍵が不正なら鍵の中身をエラーへ載せない", async () => {
		await writeConfig({ ...validConfig, r2: { accountId: "account" } });

		await expect(loadLibrarySettings()).rejects.toThrow(
			/accessKeyId, secretAccessKey/,
		);
	});
});
