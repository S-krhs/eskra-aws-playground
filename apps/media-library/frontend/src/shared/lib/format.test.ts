import { describe, expect, it } from "vitest";
import { formatByteSize, formatDuration } from "./format.js";

describe("formatByteSize", () => {
	it("1KB 未満はそのままバイトで表す", () => {
		expect(formatByteSize(512)).toBe("512 B");
	});

	it("繰り上がるたびに単位を上げる", () => {
		expect(formatByteSize(2048)).toBe("2.0 KB");
		expect(formatByteSize(5 * 1024 * 1024)).toBe("5.0 MB");
		expect(formatByteSize(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
	});

	// 単位を上げ続けると表記が壊れるため、GB で止める
	it("GB より上へは繰り上げない", () => {
		expect(formatByteSize(2048 * 1024 * 1024 * 1024)).toBe("2048.0 GB");
	});
});

describe("formatDuration", () => {
	it("分と秒に分け、秒は 2 桁で揃える", () => {
		expect(formatDuration(95_000)).toBe("1:35");
		expect(formatDuration(9_000)).toBe("0:09");
	});

	it("1 秒未満は 0:00 にする", () => {
		expect(formatDuration(400)).toBe("0:00");
	});
});
