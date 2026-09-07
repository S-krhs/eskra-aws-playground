import { describe, expect, it } from "vitest";
import {
	buildMediaObjectMetadata,
	parseMediaObjectMetadata,
} from "./media-object-metadata.js";

const mediaId = "018f3a2c-6b41-7c9d-9f02-1a5e8c3d7b40";

describe("buildMediaObjectMetadata", () => {
	// metadata は HTTP ヘッダなので ASCII しか通らない
	it("日本語のファイル名を percent-encode する", () => {
		expect(
			buildMediaObjectMetadata({ mediaId, originalName: "イラスト.png" }),
		).toEqual({
			"media-id": mediaId,
			"original-name": "%E3%82%A4%E3%83%A9%E3%82%B9%E3%83%88.png",
		});
	});
});

describe("parseMediaObjectMetadata", () => {
	it("組み立てた metadata を元へ戻す", () => {
		const originalName = "イラスト 01.png";

		expect(
			parseMediaObjectMetadata(
				buildMediaObjectMetadata({ mediaId, originalName }),
			),
		).toEqual({ mediaId, originalName });
	});

	// アプリ外から置かれたオブジェクトは metadata を持たない
	it("media-id が無ければ undefined を返す", () => {
		expect(parseMediaObjectMetadata({})).toBeUndefined();
		expect(parseMediaObjectMetadata(undefined)).toBeUndefined();
	});

	it("ファイル名が無ければ空文字にする", () => {
		expect(parseMediaObjectMetadata({ "media-id": mediaId })).toEqual({
			mediaId,
			originalName: "",
		});
	});

	// 手で置かれた metadata で復号に失敗しても取り込みを止めない
	it("percent-encode されていない値をそのまま返す", () => {
		expect(
			parseMediaObjectMetadata({
				"media-id": mediaId,
				"original-name": "100%.png",
			}),
		).toEqual({ mediaId, originalName: "100%.png" });
	});
});
