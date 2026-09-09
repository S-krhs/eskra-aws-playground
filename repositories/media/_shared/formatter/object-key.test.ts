import { describe, expect, it } from "vitest";
import {
	buildAreaKeyKeepingName,
	buildAreaObjectKey,
	buildThumbnailKey,
	extractLogicalPath,
	resolveArea,
} from "./object-key.js";

const modifiedAt = new Date("2026-09-07T04:30:45.123Z");

describe("resolveArea", () => {
	it("reads each named area back out of a key", () => {
		expect(resolveArea("_pending/a.png")).toBe("pending");
		expect(resolveArea("_inbox/a.png")).toBe("inbox");
		expect(resolveArea("_failed/a.png")).toBe("failed");
		expect(resolveArea("_thumb/a.webp")).toBe("thumbnail");
	});

	it("reads media filed into a folder as other", () => {
		expect(resolveArea("illust/original/a.png")).toBe("other");
		expect(resolveArea("a.png")).toBe("other");
	});

	// The separator matters, or a folder named _inboxes would read as the inbox area
	it("does not match a similarly named folder", () => {
		expect(resolveArea("_inboxes/a.png")).toBe("other");
	});
});

describe("buildAreaObjectKey", () => {
	// Keys are read by hand in the R2 dashboard, so the timestamp leans on JST
	it("names the object after its modified time in JST", () => {
		expect(
			buildAreaObjectKey({ area: "pending", modifiedAt, extension: "png" }),
		).toBe("_pending/20260907-133045123.png");
	});

	it("rolls the date forward when the conversion crosses midnight", () => {
		expect(
			buildAreaObjectKey({
				area: "inbox",
				modifiedAt: new Date("2026-09-07T15:00:00.000Z"),
				extension: "png",
			}),
		).toBe("_inbox/20260908-000000000.png");
	});

	it("drops a leading . from the extension and lowercases it", () => {
		expect(
			buildAreaObjectKey({ area: "inbox", modifiedAt, extension: ".PNG" }),
		).toBe("_inbox/20260907-133045123.png");
	});

	it("appends nothing when there is no extension", () => {
		expect(
			buildAreaObjectKey({ area: "inbox", modifiedAt, extension: "" }),
		).toBe("_inbox/20260907-133045123");
	});

	// Files sharing a millisecond would collide, so a counter separates them
	it("puts the counter after the timestamp", () => {
		expect(
			buildAreaObjectKey({
				area: "inbox",
				modifiedAt,
				extension: "png",
				sequence: 2,
			}),
		).toBe("_inbox/20260907-133045123-2.png");
	});
});

describe("buildAreaKeyKeepingName", () => {
	// A move keeps the name, so the object stays recognisable across areas
	it("carries the file name over to the new area", () => {
		expect(
			buildAreaKeyKeepingName({
				area: "failed",
				key: "_pending/20260907-133045123.png",
			}),
		).toBe("_failed/20260907-133045123.png");
	});

	it("takes the whole key when it has no directory part", () => {
		expect(buildAreaKeyKeepingName({ area: "inbox", key: "a.png" })).toBe(
			"_inbox/a.png",
		);
	});
});

describe("buildThumbnailKey", () => {
	// It carries no logical path, so moving the media never has to touch it
	it("names the thumbnail after the media's id alone", () => {
		expect(buildThumbnailKey("018f3a2c-6b41-7c9d-9f02-1a5e8c3d7b40")).toBe(
			"_thumb/018f3a2c-6b41-7c9d-9f02-1a5e8c3d7b40.webp",
		);
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
