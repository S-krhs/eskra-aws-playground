// In scope: アップローダが読む設定ファイルの場所の解決と検証
// Out of scope: R2 への通信、key の組み立て、設定ファイルの作成
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

/** アップローダが必要とする接続先。 */
export interface UploadSettings {
	credentials: R2Credentials;
	bucket: string;
}

/**
 * 設定ファイルを読んで接続先を組み立てる。
 * 鍵が漏れないよう、失敗しても読み込んだ内容はエラーへ載せない。
 */
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
