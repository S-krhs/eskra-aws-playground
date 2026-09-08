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
import { z } from "zod";

import { getPrismaClient } from "../../client/prisma.js";
import { gachaPoolKeys } from "../shared/literals/gacha-pool-key.js";
import { gachaRarities } from "../shared/literals/gacha-rarity.js";
import { gachaEntityRepository } from "./repository.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testId = Date.now().toString();
const names = [`test-${testId}-01`, `test-${testId}-02`, `test-${testId}-03`];
const [name, anotherName, invalidRarityName] = names as [
	string,
	string,
	string,
];

const poolKey = gachaPoolKeys.umaOneDrawTopic;

const deleteTestRows = async (): Promise<void> => {
	const prisma = getPrismaClient();
	await prisma.gachaEntity.deleteMany({
		where: { poolKey, name: { in: names } },
	});
};

describe.skipIf(!testDatabaseUrl)("gachaEntityRepository (integration)", () => {
	beforeAll(() => {
		process.env.DATABASE_URL = testDatabaseUrl;
	});

	beforeEach(deleteTestRows);
	afterEach(deleteTestRows);

	afterAll(async () => {
		await deleteTestRows();
		await getPrismaClient().$disconnect();
	});

	it("reads a pool's candidates back validated", async () => {
		await getPrismaClient().gachaEntity.createMany({
			data: [
				{ poolKey, name, rarity: gachaRarities.common },
				{ poolKey, name: anotherName, rarity: gachaRarities.rare },
			],
		});

		const entities = await gachaEntityRepository.findMany({ poolKey });
		expect(entities).toContainEqual({ rarity: gachaRarities.common, name });
		expect(entities).toContainEqual({
			rarity: gachaRarities.rare,
			name: anotherName,
		});
	});

	it("fails the read when a stored rarity violates the schema", async () => {
		await getPrismaClient().gachaEntity.create({
			data: { poolKey, name: invalidRarityName, rarity: "LEGENDARY" },
		});

		await expect(
			gachaEntityRepository.findMany({ poolKey }),
		).rejects.toBeInstanceOf(z.ZodError);
	});
});
