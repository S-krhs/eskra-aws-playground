// TODO: move to a testcontainers PostgreSQL in a separate task.
//       Until then this only runs when TEST_DATABASE_URL (a local Neon branch) is set.
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
import { mediaFolderRepository } from "./repository.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testId = Date.now().toString();

// Unique per run, so a shared branch and a parallel run never fight over the same rows
const paths = [`_test-${testId}-photos`, `_test-${testId}-photos/2024`];
const [parentPath, childPath] = paths as [string, string];

const deleteTestRows = async (): Promise<void> => {
	await getPrismaClient().mediaFolder.deleteMany({
		where: { path: { in: paths } },
	});
};

describe.skipIf(!testDatabaseUrl)("mediaFolderRepository (integration)", () => {
	beforeAll(() => {
		process.env.DATABASE_URL = testDatabaseUrl;
	});

	beforeEach(deleteTestRows);
	afterEach(deleteTestRows);

	afterAll(async () => {
		await deleteTestRows();
		await getPrismaClient().$disconnect();
	});

	it("keeps a registered folder, and reads it back by path", async () => {
		await mediaFolderRepository.insert(childPath);
		await mediaFolderRepository.insert(parentPath);

		const found = (await mediaFolderRepository.findAll()).filter((path) => {
			return paths.includes(path);
		});
		expect(found).toEqual([parentPath, childPath]);
	});

	it("takes the same folder twice without failing", async () => {
		await mediaFolderRepository.insert(parentPath);

		await expect(
			mediaFolderRepository.insert(parentPath),
		).resolves.toBeUndefined();
	});

	it("reports how many rows a delete took, so one already gone reads as 0", async () => {
		await mediaFolderRepository.insert(parentPath);

		expect(await mediaFolderRepository.delete(parentPath)).toBe(1);
		expect(await mediaFolderRepository.delete(parentPath)).toBe(0);
	});
});
