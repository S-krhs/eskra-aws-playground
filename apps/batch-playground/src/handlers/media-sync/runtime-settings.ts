// In scope: メディア同期 job が使う R2 の接続先を SST link と環境変数から解決する
// Out of scope: R2 への通信、DB への反映、Lambda イベントの検証
import {
	parseR2Credentials,
	type R2Credentials,
} from "@eskra-aws-playground/integration-r2/r2-client.js";
import { Resource } from "sst/resource";

/** メディア同期 job が使う接続先。 */
export interface MediaSyncSettings {
	credentials: R2Credentials;
	bucket: string;
}

/**
 * 同期先の R2 を解決する。
 * 鍵が漏れないよう、失敗しても secret の中身はエラーへ載せない。
 */
export const getMediaSyncSettings = (): MediaSyncSettings => {
	const bucket = process.env.MEDIA_BUCKET?.trim();

	if (!bucket) {
		throw new Error("MEDIA_BUCKET が設定されていません。");
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(Resource.R2Credentials.value);
	} catch {
		throw new Error("R2Credentials secret が JSON として不正です。");
	}

	return { credentials: parseR2Credentials(parsed), bucket };
};
