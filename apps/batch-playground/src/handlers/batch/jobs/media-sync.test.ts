import type { StoredObjectSummary } from "@eskra-aws-playground/repositories/media/media-storage/types.js";
import { describe, expect, it } from "vitest";
import {
	assertDeletableSize,
	buildMediaSyncPlan,
	decideUnknownObject,
	isMediaKey,
	type RegisteredMediaIds,
} from "./media-sync.js";

const scanned = (key: string): StoredObjectSummary => {
	return {
		key,
		byteSize: 1,
		etag: "etag",
		lastModified: new Date("2026-09-07T00:00:00.000Z"),
	};
};

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

describe("buildMediaSyncPlan", () => {
	it("splits out matching keys as already registered", () => {
		const plan = buildMediaSyncPlan({
			scanned: [scanned("_inbox/a.png")],
			known: [{ id: "id-a", objectKey: "_inbox/a.png", etag: "etag" }],
		});

		expect(plan).toEqual({
			unchangedIds: ["id-a"],
			changedObjects: [],
			unknownObjects: [],
			missingIds: [],
		});
	});

	// New versus moved needs metadata, so it stays unknown here
	it("leaves a key absent from the DB as unknown", () => {
		const plan = buildMediaSyncPlan({
			scanned: [scanned("_inbox/new.png")],
			known: [],
		});

		expect(
			plan.unknownObjects.map((object) => {
				return object.key;
			}),
		).toEqual(["_inbox/new.png"]);
		expect(plan.unchangedIds).toEqual([]);
	});

	// An overwrite under the same key changes only the etag; left alone, the dimensions and thumbnail stay stale
	it("splits out same-key different-etag entries as replacements", () => {
		const plan = buildMediaSyncPlan({
			scanned: [{ ...scanned("_inbox/a.png"), etag: "new-etag" }],
			known: [{ id: "id-a", objectKey: "_inbox/a.png", etag: "old-etag" }],
		});

		expect(
			plan.changedObjects.map((changed) => {
				return changed.id;
			}),
		).toEqual(["id-a"]);
		expect(plan.unchangedIds).toEqual([]);
		expect(plan.missingIds).toEqual([]);
	});

	it("lists an id absent from R2 as missing", () => {
		const plan = buildMediaSyncPlan({
			scanned: [],
			known: [{ id: "id-a", objectKey: "_inbox/a.png", etag: "etag" }],
		});

		expect(plan.missingIds).toEqual(["id-a"]);
	});

	// A move shows up as both a missing old key and an appearing new one
	it("puts a moved object into both the missing and the unknown sets", () => {
		const plan = buildMediaSyncPlan({
			scanned: [scanned("illust/a.png")],
			known: [{ id: "id-a", objectKey: "_inbox/a.png", etag: "etag" }],
		});

		expect(plan.missingIds).toEqual(["id-a"]);
		expect(
			plan.unknownObjects.map((object) => {
				return object.key;
			}),
		).toEqual(["illust/a.png"]);
		expect(plan.unchangedIds).toEqual([]);
	});

	it("sorts a mixed input into each classification", () => {
		const plan = buildMediaSyncPlan({
			scanned: [scanned("_inbox/a.png"), scanned("_inbox/new.png")],
			known: [
				{ id: "id-a", objectKey: "_inbox/a.png", etag: "etag" },
				{ id: "id-gone", objectKey: "_inbox/gone.png", etag: "etag" },
			],
		});

		expect(plan.unchangedIds).toEqual(["id-a"]);
		expect(
			plan.unknownObjects.map((object) => {
				return object.key;
			}),
		).toEqual(["_inbox/new.png"]);
		expect(plan.missingIds).toEqual(["id-gone"]);
	});

	it("returns an empty plan for empty input", () => {
		expect(buildMediaSyncPlan({ scanned: [], known: [] })).toEqual({
			unchangedIds: [],
			changedObjects: [],
			unknownObjects: [],
			missingIds: [],
		});
	});
});

const mediaId = "018f3a2c-6b41-7c9d-9f02-1a5e8c3d7b40";

const registered = (ids: {
	all?: string[];
	missing?: string[];
}): RegisteredMediaIds => {
	return {
		all: new Set(ids.all ?? []),
		missing: new Set(ids.missing ?? []),
	};
};

describe("decideUnknownObject", () => {
	// The original key gone and the same media-id on another key means a move
	it("treats a gone original key as a move", () => {
		expect(
			decideUnknownObject(
				{ mediaId, originalName: "a.png" },
				registered({ all: [mediaId], missing: [mediaId] }),
			),
		).toEqual({ kind: "relocate", mediaId });
	});

	// A copy carries the metadata along, putting the same media-id on two keys.
	// Treating that as a move flips objectKey between them on every run
	it("treats a surviving original key as a copy", () => {
		expect(
			decideUnknownObject(
				{ mediaId, originalName: "a.png" },
				registered({ all: [mediaId] }),
			),
		).toEqual({ kind: "duplicate", mediaId });
	});

	it("treats an unregistered UUID as new", () => {
		expect(
			decideUnknownObject({ mediaId, originalName: "a.png" }, registered({})),
		).toEqual({ kind: "insert", mediaId, originalName: "a.png" });
	});

	// Anything placed straight from the R2 dashboard or rclone carries no metadata
	it("treats a missing metadata as an adoption", () => {
		expect(
			decideUnknownObject(undefined, registered({ all: [mediaId] })),
		).toEqual({ kind: "adopt" });
	});
});

describe("assertDeletableSize", () => {
	it("passes a handful of deletions", () => {
		expect(() => {
			return assertDeletableSize(10, 20);
		}).not.toThrow();
	});

	it("passes a deletion that is small against the whole", () => {
		expect(() => {
			return assertDeletableSize(100, 10_000);
		}).not.toThrow();
	});

	// Covers a listing gone nearly empty from a narrowed token or a wrong bucket name.
	// Deleting a row takes its tag links with it, and tags added by hand can't be restored.
	it("stops a deletion covering too large a fraction", () => {
		expect(() => {
			return assertDeletableSize(5_000, 10_000);
		}).toThrow(/MEDIA_BUCKET/);
	});

	it("stops a deletion that would wipe every registered row", () => {
		expect(() => {
			return assertDeletableSize(10_000, 10_000);
		}).toThrow();
	});

	// A fraction says nothing while few rows are registered, so anything up to the floor passes
	it("passes anything up to the floor regardless of the fraction", () => {
		expect(() => {
			return assertDeletableSize(50, 50);
		}).not.toThrow();
	});
});
