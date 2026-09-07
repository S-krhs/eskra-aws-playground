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
	it("key が一致したものを登録済みとして分ける", () => {
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

	// metadata を読まないと新規か移動かは決まらないため、ここでは未知として残す
	it("DB に無い key を未知として残す", () => {
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

	// 同じ key へ上書きされると etag だけが変わる。放っておくと寸法とサムネイルが古いまま残る
	it("key が同じで etag が違うものを差し替えとして分ける", () => {
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

	it("R2 に無い id を欠落として挙げる", () => {
		const plan = buildMediaSyncPlan({
			scanned: [],
			known: [{ id: "id-a", objectKey: "_inbox/a.png", etag: "etag" }],
		});

		expect(plan.missingIds).toEqual(["id-a"]);
	});

	// 移動は「古い key の欠落」と「新しい key の出現」の両方に現れる
	it("移動されたものを欠落と未知の両方へ入れる", () => {
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

	it("混在した入力をそれぞれの分類へ振り分ける", () => {
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

	it("空の入力で空の計画を返す", () => {
		expect(buildMediaSyncPlan({ scanned: [], known: [] })).toEqual({
			unchangedIds: [],
			changedObjects: [],
			unknownObjects: [],
			missingIds: [],
		});
	});
});
