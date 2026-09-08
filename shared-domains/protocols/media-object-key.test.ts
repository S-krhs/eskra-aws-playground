import { describe, expect, it } from "vitest";
import {
	buildMediaObjectKey,
	extractLogicalPath,
	formatKeyTimestamp,
} from "./media-object-key.js";

const modifiedAt = new Date("2026-09-07T04:30:45.123Z");

describe("formatKeyTimestamp", () => {
	// Keys are read by hand in the R2 dashboard, so they lean on JST
	it("turns a UTC modified time into the JST string", () => {
		expect(formatKeyTimestamp(modifiedAt)).toBe("20260907-133045123");
	});

	it("rolls the date forward when the conversion crosses midnight", () => {
		expect(formatKeyTimestamp(new Date("2026-09-07T15:00:00.000Z"))).toBe(
			"20260908-000000000",
		);
	});
});

describe("buildMediaObjectKey", () => {
	it("builds a key from a logical path and a timestamp", () => {
		expect(
			buildMediaObjectKey({
				logicalPath: "illust/original",
				modifiedAt,
				extension: "png",
			}),
		).toBe("illust/original/20260907-133045123.png");
	});

	it("drops a leading . from the extension and lowercases it", () => {
		expect(
			buildMediaObjectKey({
				logicalPath: "illust",
				modifiedAt,
				extension: ".PNG",
			}),
		).toBe("illust/20260907-133045123.png");
	});

	it("appends nothing when there is no extension", () => {
		expect(
			buildMediaObjectKey({ logicalPath: "illust", modifiedAt, extension: "" }),
		).toBe("illust/20260907-133045123");
	});

	// Files sharing a millisecond would collide, so a counter separates them
	it("puts the counter after the timestamp", () => {
		expect(
			buildMediaObjectKey({
				logicalPath: "illust",
				modifiedAt,
				extension: "png",
				sequence: 2,
			}),
		).toBe("illust/20260907-133045123-2.png");
	});
});

describe("extractLogicalPath", () => {
	it("takes everything before the last separator as the logical path", () => {
		expect(extractLogicalPath("illust/original/a.png")).toBe("illust/original");
	});

	it("returns an empty string when there is no directory part", () => {
		expect(extractLogicalPath("a.png")).toBe("");
	});
});
