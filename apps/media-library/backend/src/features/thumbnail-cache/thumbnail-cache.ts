// In scope: R2 から取ったサムネイルをローカルへ保存し、2 回目以降はそこから返す
// Out of scope: サムネイルの生成、R2 からの取得、HTTP 応答の組み立て
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * キャッシュファイルの場所を組み立てる。
 * mediaId は UUID として検証済みのものだけを渡す(そのままファイル名にするため)。
 */
const toCachePath = (cacheDir: string, mediaId: string): string => {
	return join(cacheDir, `${mediaId}.webp`);
};

/** キャッシュ済みのサムネイルを返す。無ければ undefined。 */
export const readCachedThumbnail = async (
	cacheDir: string,
	mediaId: string,
): Promise<Buffer | undefined> => {
	try {
		return await readFile(toCachePath(cacheDir, mediaId));
	} catch {
		return undefined;
	}
};

/**
 * サムネイルをキャッシュへ保存する。
 * 書き込み途中のファイルを次の要求が読まないよう、別名で書いてから rename する。
 */
export const writeCachedThumbnail = async (
	cacheDir: string,
	mediaId: string,
	body: Uint8Array,
): Promise<void> => {
	await mkdir(cacheDir, { recursive: true });

	const destination = toCachePath(cacheDir, mediaId);
	const temporary = `${destination}.${process.pid}.tmp`;

	await writeFile(temporary, body);
	await rename(temporary, destination);
};
