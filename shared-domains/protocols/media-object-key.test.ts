import { describe, expect, it } from "vitest";
import {
	buildInboxKey,
	buildMediaObjectKey,
	extractLogicalPath,
	formatKeyTimestamp,
} from "./media-object-key.js";

const modifiedAt = new Date("2026-09-07T04:30:45.123Z");

describe("formatKeyTimestamp", () => {
	// key は人が R2 のダッシュボードで読むため JST に寄せる
	it("UTC の更新日時を JST の時刻文字列へ直す", () => {
		expect(formatKeyTimestamp(modifiedAt)).toBe("20260907-133045123");
	});

	it("日付をまたぐ変換で日付も繰り上げる", () => {
		expect(formatKeyTimestamp(new Date("2026-09-07T15:00:00.000Z"))).toBe(
			"20260908-000000000",
		);
	});
});

describe("buildMediaObjectKey", () => {
	it("論理パスと時刻から key を組み立てる", () => {
		expect(
			buildMediaObjectKey({
				logicalPath: "illust/original",
				modifiedAt,
				extension: "png",
			}),
		).toBe("illust/original/20260907-133045123.png");
	});

	it("拡張子の先頭の . を落とし小文字へ揃える", () => {
		expect(
			buildMediaObjectKey({
				logicalPath: "illust",
				modifiedAt,
				extension: ".PNG",
			}),
		).toBe("illust/20260907-133045123.png");
	});

	it("拡張子がなければ付けない", () => {
		expect(
			buildMediaObjectKey({ logicalPath: "illust", modifiedAt, extension: "" }),
		).toBe("illust/20260907-133045123");
	});

	// 同じミリ秒のファイルは key が衝突するため連番で逃がす
	it("連番を時刻の後ろに付ける", () => {
		expect(
			buildMediaObjectKey({
				logicalPath: "illust",
				modifiedAt,
				extension: "png",
				sequence: 2,
			}),
		).toBe("illust/20260907-133045123-2.png");
	});
});

describe("buildInboxKey", () => {
	it("着地点の prefix を付ける", () => {
		expect(buildInboxKey({ modifiedAt, extension: "mp4" })).toBe(
			"_inbox/20260907-133045123.mp4",
		);
	});
});

describe("extractLogicalPath", () => {
	it("最後の区切りより前を論理パスとする", () => {
		expect(extractLogicalPath("illust/original/a.png")).toBe("illust/original");
	});

	it("階層がなければ空文字を返す", () => {
		expect(extractLogicalPath("a.png")).toBe("");
	});
});
