import { describe, expect, it } from "vitest";
import { isMediaKey } from "./media-object-scan.js";

describe("isMediaKey", () => {
	it("passes both unsorted (_inbox) and sorted media", () => {
		expect(isMediaKey("_inbox/20260907-133045123.png")).toBe(true);
		expect(isMediaKey("illust/original/20260907-133045123.png")).toBe(true);
	});

	// Taking a thumbnail in would register two rows for one media file
	it("excludes the thumbnail prefix", () => {
		expect(isMediaKey("_thumb/018f3a2c.webp")).toBe(false);
	});

	// Judging on a bare prefix match would sweep in another folder
	it("does not exclude a similarly named folder", () => {
		expect(isMediaKey("_thumbnails/a.png")).toBe(true);
	});

	// Taking one in makes thumbnail generation fail forever and keeps backing up the DLQ
	it("excludes a non-media extension", () => {
		expect(isMediaKey("_inbox/memo.txt")).toBe(false);
		expect(isMediaKey("_inbox/archive.zip")).toBe(false);
	});

	// Creating a folder in the R2 dashboard leaves a placeholder object ending in a slash
	it("excludes a key with no extension", () => {
		expect(isMediaKey("illust/")).toBe(false);
		expect(isMediaKey("_inbox/no-extension")).toBe(false);
	});
});
