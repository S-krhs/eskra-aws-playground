import { describe, expect, it } from "vitest";
import { resolveContentType } from "./content-type.js";

describe("resolveContentType", () => {
	it("resolves an image extension", () => {
		expect(resolveContentType("png")).toBe("image/png");
		expect(resolveContentType("jpg")).toBe("image/jpeg");
		expect(resolveContentType("jpeg")).toBe("image/jpeg");
	});

	it("resolves a video extension", () => {
		expect(resolveContentType("mp4")).toBe("video/mp4");
		expect(resolveContentType("mov")).toBe("video/quicktime");
	});

	it("handles a leading . and uppercase", () => {
		expect(resolveContentType(".PNG")).toBe("image/png");
	});

	// Only known extensions pass, so an accidental non-media upload gets noticed
	it("returns undefined for an extension not on the list", () => {
		expect(resolveContentType("txt")).toBeUndefined();
		expect(resolveContentType("")).toBeUndefined();
	});

	// A file name reaching Object.prototype would otherwise hand back a function or an object,
	// and pass every `if (!contentType)` on the way to storage
	it("returns undefined for a key inherited from Object.prototype", () => {
		expect(resolveContentType("constructor")).toBeUndefined();
		expect(resolveContentType("__proto__")).toBeUndefined();
		expect(resolveContentType("toString")).toBeUndefined();
		expect(resolveContentType(".hasOwnProperty")).toBeUndefined();
	});
});
