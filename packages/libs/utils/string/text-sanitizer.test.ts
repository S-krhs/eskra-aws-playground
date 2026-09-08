import { describe, expect, it } from "vitest";

import { sanitizeText } from "./text-sanitizer.js";

describe("sanitizeText", () => {
	it("applies the replacement list in order", () => {
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

	it("replaces every occurrence for a string pattern", () => {
		expect(
			sanitizeText("alice met alice", {
				replacements: [
					{
						pattern: "alice",
						replacement: "user",
					},
				],
				maxLength: 100,
			}),
		).toBe("user met user");
	});

	it("truncates the replaced string to maxLength", () => {
		expect(
			sanitizeText("0123456789", {
				maxLength: 4,
			}),
		).toBe("0123");
	});

	it("truncates to the default max length when maxLength is omitted", () => {
		expect(sanitizeText("x".repeat(600), {}).length).toBe(512);
	});

	it("errors on an invalid maxLength", () => {
		expect(() => {
			return sanitizeText("text", {
				maxLength: -1,
			});
		}).toThrow("maxLength は 0 以上の整数を指定してください");
	});
});
