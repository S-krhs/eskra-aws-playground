import { describe, expect, it } from "vitest";
import { toWslPath } from "./windows-path.js";

describe("toWslPath", () => {
	it("moves the drive letter under /mnt in lowercase", () => {
		expect(toWslPath("C:\\Users\\foo\\a.png")).toBe("/mnt/c/Users/foo/a.png");
	});

	it("accepts a Windows path separated by /", () => {
		expect(toWslPath("D:/Media/a.mp4")).toBe("/mnt/d/Media/a.mp4");
	});

	it("passes a path containing Japanese straight through", () => {
		expect(toWslPath("C:\\Users\\foo\\イラスト\\a.png")).toBe(
			"/mnt/c/Users/foo/イラスト/a.png",
		);
	});

	// No conversion when invoked straight from WSL
	it("returns a POSIX path unchanged", () => {
		expect(toWslPath("/mnt/c/Users/foo/a.png")).toBe("/mnt/c/Users/foo/a.png");
	});

	it("handles a file at the drive root", () => {
		expect(toWslPath("C:\\a.png")).toBe("/mnt/c/a.png");
	});

	it("fails on anything that is not a drive path", () => {
		expect(() => {
			return toWslPath("a.png");
		}).toThrow(/解釈できませんでした/);
	});

	// SendTo never hands over a UNC path, and its conversion rules differ, so it is refused
	it("refuses a UNC path", () => {
		expect(() => {
			return toWslPath("\\\\server\\share\\a.png");
		}).toThrow(/解釈できませんでした/);
	});
});
