// In scope: 管理ツールが読む設定ファイルの検証と、接続先・実行時設定の組み立て
// Out of scope: R2 や Lambda への通信、DB への接続、設定ファイルの作成
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	parseR2Credentials,
	type R2Credentials,
} from "@eskra-aws-playground/integration-r2/r2-client.js";
import { resolveMediaLibraryConfigPath } from "@eskra-aws-playground/shared-domains/contracts/media-library-config.js";
import { z } from "zod";

/** 待ち受けポート。掴めなければ既に起動していると判断する。 */
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

/** 管理ツールが必要とする接続先と実行時設定。 */
export interface LibrarySettings {
	credentials: R2Credentials;
	bucket: string;
	databaseUrl: string;
	syncFunctionName: string;
	awsRegion: string;
	thumbnailCacheDir: string;
	port: number;
}

/**
 * 設定ファイルを読んで接続先を組み立てる。
 * 鍵や接続文字列が漏れないよう、失敗しても読み込んだ内容はエラーに載せない。
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

	return {
		credentials: parseR2Credentials(result.data.r2),
		bucket: result.data.bucket,
		databaseUrl: result.data.databaseUrl,
		syncFunctionName: result.data.syncFunctionName,
		awsRegion: result.data.awsRegion,
		thumbnailCacheDir:
			result.data.thumbnailCacheDir ?? DEFAULT_THUMBNAIL_CACHE_DIR,
		port: result.data.port ?? DEFAULT_PORT,
	};
};
