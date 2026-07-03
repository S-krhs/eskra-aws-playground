import { describe, expect, it } from "vitest";

import { sanitizeText } from "./text-sanitizer.js";

describe("sanitizeText", () => {
	it("置換リストを順に適用する", () => {
		expect(
			sanitizeText("token=secret user=alice", {
				replacements: [
					{
						pattern: /token=[^\s]+/g,
						replacement: "token=[redacted]",
					},
					{
						pattern: "alice",
						replacement: "user",
					},
				],
				maxLength: 100,
			}),
		).toBe("token=[redacted] user=user");
	});

	it("置換後の文字列を最大文字数で切り詰める", () => {
		expect(
			sanitizeText("0123456789", {
				maxLength: 4,
			}),
		).toBe("0123");
	});

	it("maxLength 未指定ならデフォルトの最大文字数で切り詰める", () => {
		expect(sanitizeText("x".repeat(600), {}).length).toBe(512);
	});

	it("maxLength が不正ならエラーにする", () => {
		expect(() =>
			sanitizeText("text", {
				maxLength: -1,
			}),
		).toThrow("maxLength は 0 以上の整数を指定してください");
	});
});
