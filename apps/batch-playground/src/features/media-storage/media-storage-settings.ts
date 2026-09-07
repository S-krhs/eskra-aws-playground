// In scope: R2 の接続先を表す設定の検証と組み立て
// Out of scope: 設定値の取得元の解決(SST link と環境変数の読み出し)、R2 への通信
import {
	parseR2Credentials,
	type R2Credentials,
} from "@eskra-aws-playground/integration-r2/r2-client.js";

/** メディアライブラリが読み書きする R2 の接続先。 */
export interface MediaStorageSettings {
	credentials: R2Credentials;
	bucket: string;
}

/**
 * 未検証の値から R2 の接続先を組み立てる。
 * 鍵が漏れないよう、失敗しても secret の中身はエラーへ載せない。
 */
export const parseMediaStorageSettings = (input: {
	credentialsJson: string | undefined;
	bucket: string | undefined;
}): MediaStorageSettings => {
	const bucket = input.bucket?.trim();

	if (!bucket) {
		throw new Error("MEDIA_BUCKET が設定されていません。");
	}

	if (!input.credentialsJson) {
		throw new Error("R2Credentials secret が設定されていません。");
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(input.credentialsJson);
	} catch {
		throw new Error("R2Credentials secret が JSON として不正です。");
	}

	return { credentials: parseR2Credentials(parsed), bucket };
};
