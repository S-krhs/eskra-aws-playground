// In scope: R2 client の生成。プロセス内で 1 インスタンスを再利用する
// Out of scope: 設定ファイルの読み込み、オブジェクト操作、HTTP の解釈
import {
	createR2Client,
	type R2Client,
} from "@eskra-aws-playground/integration-r2/r2-client.js";
import { getLibrarySettings } from "./library-settings.js";

let client: R2Client | undefined;

/**
 * module スコープで再利用する R2 client を返す。
 * 接続先は読み込み済みの設定から解決するため、先に loadLibrarySettings を済ませておく。
 */
export const getR2Client = (): R2Client => {
	if (client) {
		return client;
	}

	client = createR2Client(getLibrarySettings().credentials);

	return client;
};
