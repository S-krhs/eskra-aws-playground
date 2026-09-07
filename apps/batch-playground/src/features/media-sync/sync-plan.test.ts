import { describe, expect, it } from "vitest";
import { buildMediaSyncPlan, type ScannedObject } from "./sync-plan.js";

const scanned = (key: string): ScannedObject => {
	return {
		key,
		byteSize: 1,
		etag: "etag",
		lastModified: new Date("2026-09-07T00:00:00.000Z"),
	};
};

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
