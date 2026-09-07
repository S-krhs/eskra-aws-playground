// TODO: 別タスクで testcontainers の PostgreSQL に移行する。
//       それまでは TEST_DATABASE_URL(ローカル用 Neon branch)が設定されている場合のみ実行される。
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

import { getPrismaClient } from "../../db/client.js";
import { mediaObjectRepository } from "./repository.js";
import type { InsertMediaObjectInput } from "./types.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testId = Date.now().toString();
const keyPrefix = `_test-${testId}/`;

// 並行実行や共有 branch で行を取り合わないよう、実行ごとに一意な id を使う
const ids = [randomUUID(), randomUUID(), randomUUID()];
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

	it("登録した内容を型を戻して読み出す", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);

		const found = await mediaObjectRepository.findById(olderId);
		expect(found).toMatchObject({
			id: olderId,
			objectKey: `${keyPrefix}a.png`,
			fileName: "イラスト.png",
			// BigInt の列を number へ戻していることを確かめる
			byteSize: 1234,
		});
		// null の列は undefined へ寄せる
		expect(found?.width).toBeUndefined();
		expect(found?.trashedAt).toBeUndefined();
	});

	it("同じ id の再登録を無視する", async () => {
		const input = buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z");
		await mediaObjectRepository.insertMany([input]);

		const inserted = await mediaObjectRepository.insertMany([input]);
		expect(inserted).toBe(0);
	});

	it("突き合わせ用に id と key と etag だけを返す", async () => {
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

	// 同じ key のまま差し替わった場合、サムネイルと寸法は作り直しになる
	it("差し替わったメディアを作り直し、サムネイルを消す", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);
		await mediaObjectRepository.setThumbnail({
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
		expect(found?.thumbnailKey).toBeUndefined();
		expect(found?.width).toBeUndefined();
	});

	it("消える前のサムネイルの key を拾える", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
			buildInput(newerId, "b.png", "2026-09-02T00:00:00.000Z"),
		]);
		await mediaObjectRepository.setThumbnail({
			id: olderId,
			thumbnailKey: "_thumb/a.webp",
		});

		expect(
			await mediaObjectRepository.findThumbnailKeys([olderId, newerId]),
		).toEqual(["_thumb/a.webp"]);
	});

	// 生成中に行が消えていても worker を失敗させない
	it("消えた行へのサムネイル記録を 0 件として返す", async () => {
		expect(
			await mediaObjectRepository.setThumbnail({
				id: trashedId,
				thumbnailKey: "_thumb/gone.webp",
			}),
		).toBe(0);
	});

	it("新着順に返し、ゴミ箱に入れたものを除外する", async () => {
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

	it("cursor で続きから返す", async () => {
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

	it("content-type の接頭辞で絞る", async () => {
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

	it("外部で移動された key を付け替える", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);
		const relocatedAt = new Date("2026-09-08T00:00:00.000Z");

		await mediaObjectRepository.relocateMany([
			{
				id: olderId,
				objectKey: `${keyPrefix}illust/a.png`,
				logicalPath: `${keyPrefix}illust`,
				syncedAt: relocatedAt,
			},
		]);

		const found = await mediaObjectRepository.findById(olderId);
		expect(found?.objectKey).toBe(`${keyPrefix}illust/a.png`);
		expect(found?.syncedAt).toEqual(relocatedAt);
	});

	it("存在し続けたものの確認時刻を更新する", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);
		const touchedAt = new Date("2026-09-09T00:00:00.000Z");

		const touched = await mediaObjectRepository.touchMany([olderId], touchedAt);
		expect(touched).toBe(1);

		const found = await mediaObjectRepository.findById(olderId);
		expect(found?.syncedAt).toEqual(touchedAt);
	});

	it("R2 から消えた行を削除する", async () => {
		await mediaObjectRepository.insertMany([
			buildInput(olderId, "a.png", "2026-09-01T00:00:00.000Z"),
		]);

		const deleted = await mediaObjectRepository.deleteByIds([olderId]);
		expect(deleted).toBe(1);
		expect(await mediaObjectRepository.findById(olderId)).toBeUndefined();
	});

	it("空の入力で DB を呼ばない", async () => {
		expect(await mediaObjectRepository.insertMany([])).toBe(0);
		expect(await mediaObjectRepository.relocateMany([])).toBe(0);
		expect(await mediaObjectRepository.touchMany([], syncedAt)).toBe(0);
		expect(await mediaObjectRepository.deleteByIds([])).toBe(0);
	});
});
