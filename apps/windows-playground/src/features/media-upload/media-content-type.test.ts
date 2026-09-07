import { describe, expect, it } from "vitest";
import { resolveContentType } from "./media-content-type.js";

describe("resolveContentType", () => {
	it("画像の拡張子を解決する", () => {
		expect(resolveContentType("png")).toBe("image/png");
		expect(resolveContentType("jpg")).toBe("image/jpeg");
		expect(resolveContentType("jpeg")).toBe("image/jpeg");
	});

	it("動画の拡張子を解決する", () => {
		expect(resolveContentType("mp4")).toBe("video/mp4");
		expect(resolveContentType("mov")).toBe("video/quicktime");
	});

	it("先頭の . と大文字を吸収する", () => {
		expect(resolveContentType(".PNG")).toBe("image/png");
	});

	// メディア以外を誤って送ったときに気づけるよう、既知の拡張子だけを通す
	it("対象外の拡張子は undefined を返す", () => {
		expect(resolveContentType("txt")).toBeUndefined();
		expect(resolveContentType("")).toBeUndefined();
	});
});
