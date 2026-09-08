import { describe, expect, it } from "vitest";
import { buildCopySource } from "./r2-object-store.js";

describe("buildCopySource", () => {
	it("builds a path prefixed with the bucket name", () => {
		expect(buildCopySource("media", "_inbox/abc.png")).toBe(
			"media/_inbox/abc.png",
		);
	});

	it("leaves directory separators unencoded", () => {
		expect(buildCopySource("media", "illust/original/abc.png")).toBe(
			"media/illust/original/abc.png",
		);
	});

	it("encodes a non-ASCII folder name", () => {
		expect(buildCopySource("media", "イラスト/abc.png")).toBe(
			"media/%E3%82%A4%E3%83%A9%E3%82%B9%E3%83%88/abc.png",
		);
	});

	it("encodes spaces and symbols", () => {
		expect(buildCopySource("media", "my folder/a+b.png")).toBe(
			"media/my%20folder/a%2Bb.png",
		);
	});
});
