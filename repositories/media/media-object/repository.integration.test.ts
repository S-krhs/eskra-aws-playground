// TODO: move to a testcontainers PostgreSQL in a separate task.
//       Until then this only runs when TEST_DATABASE_URL (a local Neon branch) is set.
import { randomUUID } from "node:crypto";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";

import { getPrismaClient } from "../../client/prisma.js";
import { mediaObjectRepository } from "./repository.js";
import type { InsertMediaObjectInput } from "./types.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testId = Date.now().toString();
const keyPrefix = `_test-${testId}/`;

// A unique id per run, so parallel runs and a shared branch never fight over the same rows
const ids: string[] = [randomUUID(), randomUUID(), randomUUID()];
const [olderId, newerId, trashedId] = ids as [string, string, string];

const syncedAt = new Date("2026-09-07T00:00:00.000Z");

const buildInput = (
	id: string,
	objectKey: string,
	uploadedAt: string,
	overrides: Partial<InsertMediaObjectInput> = {},
): InsertMediaObjectInput => {
	return {
		id,
		objectKey: `${keyPrefix}${objectKey}`,
		logicalPath: "_inbox",
		fileName: "イラスト.png",
		contentType: "image/png",
		byteSize: 1234,
		etag: "etag-1",
		uploadedAt: new Date(uploadedAt),
		syncedAt,
		...overrides,
	};
};

const deleteTestRows = async (): Promise<void> => {
	await getPrismaClient().mediaObject.deleteMany({
		where: { id: { in: ids } },
	});
};

describe.skipIf(!testDatabaseUrl)("mediaObjectRepository (integration)", () => {
	beforeAll(() => {
		process.env.DATABASE_URL = testDatabaseUrl;
	});

	beforeEach(deleteTestRows);
	afterEach(deleteTestRows);

	afterAll(async () => {
		await deleteTestRows();
		await getPrismaClient().$disconnect();
	});

	it("reads a registered row back with its types restored", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);

		const found = await mediaObjectRepository.findById(olderId);
		expect(found).toMatchObject({
			id: olderId,
			objectKey: `${keyPrefix}a.png`,
			fileName: "イラスト.png",
			// Check that a BigInt column comes back as a number
			byteSize: 1234,
		});
		// A null column becomes undefined
		expect(found?.width).toBeUndefined();
		expect(found?.trashedAt).toBeUndefined();
	});

	it("ignores re-registering the same id", async () => {
		const input = buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z");
		await mediaObjectRepository.insertMany([input]);

		const inserted = await mediaObjectRepository.insertMany([input]);
		expect(inserted).toBe(0);
	});

	it("returns only id, key and etag for the comparison", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);

		const summaries = await mediaObjectRepository.findAllSummaries();
		expect(summaries).toContainEqual({
			id: olderId,
			objectKey: `${keyPrefix}a.png`,
			etag: "etag-1",
		});
	});

	// When content is replaced under an unchanged key, the thumbnail and dimensions have to be rebuilt
	it("re-registers replaced media and clears its thumbnail", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);
		await mediaObjectRepository.updateThumbnail({
			id: olderId,
			thumbnailKey: "_thumb/a.webp",
			width: 320,
			height: 180,
		});

		const refreshedAt = new Date("2026-09-10T00:00:00.000Z");
		await mediaObjectRepository.refreshMany([
			{
				id: olderId,
				byteSize: 5678,
				etag: "etag-2",
				uploadedAt: refreshedAt,
				syncedAt: refreshedAt,
			},
		]);

		const found = await mediaObjectRepository.findById(olderId);
		expect(found?.etag).toBe("etag-2");
		expect(found?.byteSize).toBe(5678);
		expect(found?.hasThumbnail).toBe(false);
		expect(found?.width).toBeUndefined();
	});

	// A row deleted mid-generation must not fail the worker
	it("reports 0 rows when recording a thumbnail onto a deleted row", async () => {
		expect(
			await mediaObjectRepository.updateThumbnail({
				id: trashedId,
				thumbnailKey: "_thumb/gone.webp",
			}),
		).toBe(0);
	});

	it("returns newest first and excludes trashed rows", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
			buildInput(newerId, "b.png", "2026-09-02T00:00:00.000Z"),
			buildInput(trashedId, "c.png", "2026-09-03T00:00:00.000Z"),
		]);
		await getPrismaClient().mediaObject.update({
			where: { id: trashedId },
			data: { trashedAt: syncedAt },
		});

		const page = await mediaObjectRepository.findPage({
			logicalPath: "_inbox",
			limit: 10,
		});
		expect(
			page.objects.map((object) => {
				return object.id;
			}),
		).toEqual([newerId, olderId]);
		expect(page.nextCursor).toBeUndefined();
	});

	it("resumes from a cursor", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
			buildInput(newerId, "b.png", "2026-09-02T00:00:00.000Z"),
		]);

		const first = await mediaObjectRepository.findPage({
			logicalPath: "_inbox",
			limit: 1,
		});
		expect(
			first.objects.map((object) => {
				return object.id;
			}),
		).toEqual([newerId]);
		expect(first.nextCursor).toBeDefined();

		const second = await mediaObjectRepository.findPage({
			logicalPath: "_inbox",
			limit: 1,
			cursor: first.nextCursor,
		});
		expect(
			second.objects.map((object) => {
				return object.id;
			}),
		).toEqual([olderId]);
		expect(second.nextCursor).toBeUndefined();
	});

	it("filters by a content-type prefix", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
			buildInput(newerId, "b.mp4", "2026-09-02T00:00:00.000Z", {
				contentType: "video/mp4",
			}),
		]);

		const page = await mediaObjectRepository.findPage({
			logicalPath: "_inbox",
			contentTypePrefix: "video/",
			limit: 10,
		});
		expect(
			page.objects.map((object) => {
				return object.id;
			}),
		).toEqual([newerId]);
	});

	it("re-points a key moved outside this app", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);
		const relocatedAt = new Date("2026-09-08T00:00:00.000Z");

		await mediaObjectRepository.relocateMany([
			{
				id: olderId,
				objectKey: `${keyPrefix}illust/a.png`,
				logicalPath: `${keyPrefix}illust`,
				byteSize: 4321,
				etag: "etag-moved",
				syncedAt: relocatedAt,
			},
		]);

		const found = await mediaObjectRepository.findById(olderId);
		expect(found?.objectKey).toBe(`${keyPrefix}illust/a.png`);
		// A move is carried out as a copy, which can change the etag; leaving it stale would make the
		// next sync read the object as replaced content
		expect(found?.etag).toBe("etag-moved");
		expect(found?.byteSize).toBe(4321);
		expect(found?.syncedAt).toEqual(relocatedAt);
	});

	it("updates the last-seen time of rows still present", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);
		const touchedAt = new Date("2026-09-09T00:00:00.000Z");

		const touched = await mediaObjectRepository.touchMany([olderId], touchedAt);
		expect(touched).toBe(1);

		const found = await mediaObjectRepository.findById(olderId);
		expect(found?.syncedAt).toEqual(touchedAt);
	});

	it("deletes rows gone from R2", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);

		const deleted = await mediaObjectRepository.deleteByIds([olderId]);
		expect(deleted).toBe(1);
		expect(await mediaObjectRepository.findById(olderId)).toBeUndefined();
	});

	// Generation moves media out of the pending area, and the row has to follow it in the same write
	it("records where the media landed along with its thumbnail", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);
		const completedAt = new Date("2026-09-08T00:00:00.000Z");

		await mediaObjectRepository.updateThumbnail({
			id: olderId,
			thumbnailKey: "_thumb/a.webp",
			width: 320,
			height: 180,
			location: {
				objectKey: `${keyPrefix}_inbox/a.png`,
				logicalPath: `${keyPrefix}_inbox`,
				byteSize: 4321,
				etag: "etag-moved",
				syncedAt: completedAt,
			},
		});

		const found = await mediaObjectRepository.findById(olderId);
		expect(found?.hasThumbnail).toBe(true);
		expect(found?.objectKey).toBe(`${keyPrefix}_inbox/a.png`);
		expect(found?.etag).toBe("etag-moved");
	});

	it("does not hit the DB on empty input", async () => {
		expect(await mediaObjectRepository.insertMany([])).toBe(0);
		expect(await mediaObjectRepository.relocateMany([])).toBe(0);
		expect(await mediaObjectRepository.touchMany([], syncedAt)).toBe(0);
		expect(await mediaObjectRepository.deleteByIds([])).toBe(0);
	});
});
