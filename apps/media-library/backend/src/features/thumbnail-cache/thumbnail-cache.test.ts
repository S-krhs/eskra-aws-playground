import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	readCachedThumbnail,
	writeCachedThumbnail,
} from "./thumbnail-cache.js";

const mediaId = "11111111-1111-4111-8111-111111111111";
let cacheDir: string;

beforeEach(async () => {
	cacheDir = await mkdtemp(join(tmpdir(), "media-thumbnail-cache-"));
});

afterEach(async () => {
	await rm(cacheDir, { recursive: true, force: true });
});

describe("thumbnailCache", () => {
	it("保存した内容をそのまま読み出す", async () => {
		await writeCachedThumbnail(cacheDir, mediaId, new Uint8Array([1, 2, 3]));

		const cached = await readCachedThumbnail(cacheDir, mediaId);
		expect(cached && [...cached]).toEqual([1, 2, 3]);
	});

	// 初回は保存されていない。ここで落とすと R2 から取り直せなくなる
	it("保存していない id は undefined を返す", async () => {
		expect(await readCachedThumbnail(cacheDir, mediaId)).toBeUndefined();
	});

	it("キャッシュ先のディレクトリが無ければ作る", async () => {
		const nested = join(cacheDir, "a", "b");
		await writeCachedThumbnail(nested, mediaId, new Uint8Array([1]));

		expect(await readdir(nested)).toEqual([`${mediaId}.webp`]);
	});

	// 書き込み途中のファイルを次の要求が読まないよう、別名で書いてから rename する
	it("書き込みの後に一時ファイルを残さない", async () => {
		await writeCachedThumbnail(cacheDir, mediaId, new Uint8Array([1]));

		expect(await readdir(cacheDir)).toEqual([`${mediaId}.webp`]);
	});
});
