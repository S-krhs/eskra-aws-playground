// In scope: route が共有する接続先と client の受け渡し型
// Out of scope: 設定ファイルの読み込み、client の生成、route の実装
import type { R2Client } from "@eskra-aws-playground/integration-r2/r2-client.js";
import type { LibrarySettings } from "./library-settings.js";

/** route へ渡す接続先一式。プロセス起動時に 1 度だけ組み立てる。 */
export interface LibraryContext {
	settings: LibrarySettings;
	r2: R2Client;
}
