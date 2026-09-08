import { describe, expect, it } from "vitest";
import { formatByteSize, formatDuration } from "./format.js";

describe("formatByteSize", () => {
	it("keeps anything under 1KB in bytes", () => {
		expect(formatByteSize(512)).toBe("512 B");
	});

	it("moves up a unit on every carry", () => {
		expect(formatByteSize(2048)).toBe("2.0 KB");
		expect(formatByteSize(5 * 1024 * 1024)).toBe("5.0 MB");
		expect(formatByteSize(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
	});

	// Climbing further would break the notation, so it stops at GB
	it("never carries past GB", () => {
		expect(formatByteSize(2048 * 1024 * 1024 * 1024)).toBe("2048.0 GB");
	});
});

describe("formatDuration", () => {
	it("splits into minutes and seconds, padding seconds to 2 digits", () => {
		expect(formatDuration(95_000)).toBe("1:35");
		expect(formatDuration(9_000)).toBe("0:09");
	});

	it("renders anything under a second as 0:00", () => {
		expect(formatDuration(400)).toBe("0:00");
	});
});
