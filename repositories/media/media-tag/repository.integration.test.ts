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
import { mediaObjectRepository } from "../media-object/repository.js";
import { mediaTagRepository } from "./repository.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testId = Date.now().toString();
const keyPrefix = `_test-${testId}/`;
// Its own folder, so a listing this file makes can't pick up rows another test file left in _inbox
const logicalPath = `_test-${testId}-tags`;

// Unique per run, so a shared branch and a parallel run never fight over the same rows
const mediaId = randomUUID();
const otherMediaId = randomUUID();
const tagNames = [`_test-${testId}-風景`, `_test-${testId}-資料`];
const [landscapeTag, referenceTag] = tagNames as [string, string];

const syncedAt = new Date("2026-09-11T00:00:00.000Z");

const insertMedia = async (id: string, objectKey: string): Promise<void> => {
	await mediaObjectRepository.insertMany([
		{
			id,
			objectKey: `${keyPrefix}${objectKey}`,
			logicalPath,
			fileName: "イラスト.png",
			contentType: "image/png",
			byteSize: 1234,
			etag: "etag-1",
			uploadedAt: syncedAt,
			syncedAt,
		},
	]);
};

const deleteTestRows = async (): Promise<void> => {
	const prisma = getPrismaClient();

	// The links go with the media rows; the tags themselves are named per run
	await prisma.mediaObject.deleteMany({
		where: { id: { in: [mediaId, otherMediaId] } },
	});
	await prisma.mediaTag.deleteMany({ where: { name: { in: tagNames } } });
};

describe.skipIf(!testDatabaseUrl)("mediaTagRepository (integration)", () => {
	beforeAll(() => {
		process.env.DATABASE_URL = testDatabaseUrl;
	});

	beforeEach(deleteTestRows);
	afterEach(deleteTestRows);

	afterAll(async () => {
		await deleteTestRows();
		await getPrismaClient().$disconnect();
	});

	it("creates the tags it hasn't seen and reports them back on the media", async () => {
		await insertMedia(mediaId, "a.png");

		const tags = await mediaTagRepository.replaceObjectTags(mediaId, tagNames);

		expect(
			tags.map((tag) => {
				return tag.name;
			}),
		).toEqual([...tagNames].sort());
		expect((await mediaObjectRepository.findById(mediaId))?.tags).toEqual(
			[...tagNames].sort(),
		);
	});

	it("drops a tag left on nothing, and keeps one another media still carries", async () => {
		await insertMedia(mediaId, "a.png");
		await insertMedia(otherMediaId, "b.png");
		await mediaTagRepository.replaceObjectTags(mediaId, tagNames);
		await mediaTagRepository.replaceObjectTags(otherMediaId, [landscapeTag]);

		await mediaTagRepository.replaceObjectTags(mediaId, [landscapeTag]);

		const names = (await mediaTagRepository.findAll()).map((tag) => {
			return tag.name;
		});
		expect(names).toContain(landscapeTag);
		expect(names).not.toContain(referenceTag);
	});

	it("clears every tag when given nothing to keep", async () => {
		await insertMedia(mediaId, "a.png");
		await mediaTagRepository.replaceObjectTags(mediaId, tagNames);

		expect(await mediaTagRepository.replaceObjectTags(mediaId, [])).toEqual([]);
		expect((await mediaObjectRepository.findById(mediaId))?.tags).toEqual([]);
	});

	it("narrows the listing to the media carrying one tag", async () => {
		await insertMedia(mediaId, "a.png");
		await insertMedia(otherMediaId, "b.png");
		await mediaTagRepository.replaceObjectTags(mediaId, [referenceTag]);

		const page = await mediaObjectRepository.findPage({
			trashed: false,
			logicalPath,
			tagName: referenceTag,
			limit: 10,
		});

		expect(
			page.objects.map((object) => {
				return object.id;
			}),
		).toEqual([mediaId]);
	});
});
