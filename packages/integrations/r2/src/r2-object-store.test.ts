import { describe, expect, it } from "vitest";
import { buildCopySource } from "./r2-object-store.js";

describe("buildCopySource", () => {
	it("bucket 名を前置した path を組み立てる", () => {
		expect(buildCopySource("media", "_inbox/abc.png")).toBe(
			"media/_inbox/abc.png",
		);
	});

	it("階層の区切りを encode せず残す", () => {
		expect(buildCopySource("media", "illust/original/abc.png")).toBe(
			"media/illust/original/abc.png",
		);
	});

	it("日本語のフォルダ名を encode する", () => {
		expect(buildCopySource("media", "イラスト/abc.png")).toBe(
			"media/%E3%82%A4%E3%83%A9%E3%82%B9%E3%83%88/abc.png",
		);
	});

	it("space や記号を encode する", () => {
		expect(buildCopySource("media", "my folder/a+b.png")).toBe(
			"media/my%20folder/a%2Bb.png",
		);
	});
});
