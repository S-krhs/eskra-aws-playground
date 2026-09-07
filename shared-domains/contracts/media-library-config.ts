// In scope: メディアライブラリの設定ファイルの置き場所の規約
// Out of scope: 設定ファイルの読み込み、項目の検証、接続先の組み立て
import { homedir } from "node:os";
import { join } from "node:path";

/** 設定ファイルの置き場所を差し替える環境変数の名前。 */
export const MEDIA_LIBRARY_CONFIG_ENV = "MEDIA_LIBRARY_CONFIG";

const DEFAULT_CONFIG_PATH = join(
	homedir(),
	".config",
	"eskra-media-library",
	"config.json",
);

/**
 * 設定ファイルの置き場所を返す。
 * アップローダと管理ツールが同じファイルを読むよう、決め方をここ 1 箇所に置く。
 */
export const resolveMediaLibraryConfigPath = (): string => {
	return process.env[MEDIA_LIBRARY_CONFIG_ENV] ?? DEFAULT_CONFIG_PATH;
};
