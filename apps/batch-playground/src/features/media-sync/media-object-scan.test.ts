import { describe, expect, it } from "vitest";
import { isMediaKey } from "./media-object-scan.js";

describe("isMediaKey", () => {
	it("着地点と整理済みのメディアを通す", () => {
		expect(isMediaKey("_inbox/20260907-133045123.png")).toBe(true);
		expect(isMediaKey("illust/original/20260907-133045123.png")).toBe(true);
	});

	// サムネイルを取り込むと、メディア 1 件につき 2 行が登録されてしまう
	it("サムネイルの置き場を除く", () => {
		expect(isMediaKey("_thumb/018f3a2c.webp")).toBe(false);
	});

	// prefix の前方一致だけで判定すると別フォルダを巻き込む
	it("名前の似たフォルダを除かない", () => {
		expect(isMediaKey("_thumbnails/a.png")).toBe(true);
	});
});
