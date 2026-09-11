import { describe, expect, it } from "vitest";
import { parseIfNoneMatch, toStrongEtag, toWeakEtag } from "./etag.js";

describe("toWeakEtag", () => {
	it("marks the value as identifying the content rather than the bytes", () => {
		expect(toWeakEtag("abc123")).toBe('W/"abc123"');
	});
});

describe("toStrongEtag", () => {
	it("quotes the value as identifying the bytes themselves", () => {
		expect(toStrongEtag("abc123")).toBe('"abc123"');
	});
});

describe("parseIfNoneMatch", () => {
	it("reads back both shapes the header can carry", () => {
		expect(parseIfNoneMatch('W/"abc123", "def456"')).toEqual([
			"abc123",
			"def456",
		]);
	});

	it("has nothing to compare against when the caller sent no header", () => {
		expect(parseIfNoneMatch(undefined)).toEqual([]);
	});
});
