import { describe, expect, it } from "vitest";
import { toWslPath } from "./windows-path.js";

describe("toWslPath", () => {
	it("ドライブレターを /mnt の小文字へ移す", () => {
		expect(toWslPath("C:\\Users\\foo\\a.png")).toBe("/mnt/c/Users/foo/a.png");
	});

	it("区切りが / の Windows パスも受ける", () => {
		expect(toWslPath("D:/Media/a.mp4")).toBe("/mnt/d/Media/a.mp4");
	});

	it("日本語を含むパスをそのまま通す", () => {
		expect(toWslPath("C:\\Users\\foo\\イラスト\\a.png")).toBe(
			"/mnt/c/Users/foo/イラスト/a.png",
		);
	});

	// WSL から直接叩いたときに変換を挟まない
	it("POSIX のパスはそのまま返す", () => {
		expect(toWslPath("/mnt/c/Users/foo/a.png")).toBe("/mnt/c/Users/foo/a.png");
	});

	it("ドライブの直下も扱う", () => {
		expect(toWslPath("C:\\a.png")).toBe("/mnt/c/a.png");
	});

	it("ドライブパスでなければ失敗させる", () => {
		expect(() => {
			return toWslPath("a.png");
		}).toThrow(/解釈できませんでした/);
	});

	// UNC パスは SendTo からは渡らず、変換規則も違うため受け付けない
	it("UNC パスを受け付けない", () => {
		expect(() => {
			return toWslPath("\\\\server\\share\\a.png");
		}).toThrow(/解釈できませんでした/);
	});
});
