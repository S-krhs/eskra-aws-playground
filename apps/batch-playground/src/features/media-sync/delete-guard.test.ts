import { describe, expect, it } from "vitest";
import { assertDeletableSize } from "./delete-guard.js";

describe("assertDeletableSize", () => {
	it("少数の削除は通す", () => {
		expect(() => {
			return assertDeletableSize(10, 20);
		}).not.toThrow();
	});

	it("全体からみて少ない削除は通す", () => {
		expect(() => {
			return assertDeletableSize(100, 10_000);
		}).not.toThrow();
	});

	// token の権限縮小や bucket 名の誤りで一覧がほぼ空になる場合を想定したテスト。
	// 行を削除するとタグの紐付けも一緒に削除され、手で付けたタグは戻せない。
	it("割合が大きすぎる削除を止める", () => {
		expect(() => {
			return assertDeletableSize(5_000, 10_000);
		}).toThrow(/MEDIA_BUCKET/);
	});

	it("登録が全件消える削除を止める", () => {
		expect(() => {
			return assertDeletableSize(10_000, 10_000);
		}).toThrow();
	});

	// 登録件数が少ないうちは割合で判断できないため、下限までは通す
	it("下限までは割合に関わらず通す", () => {
		expect(() => {
			return assertDeletableSize(50, 50);
		}).not.toThrow();
	});
});
