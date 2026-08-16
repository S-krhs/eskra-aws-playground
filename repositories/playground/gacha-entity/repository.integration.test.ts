// TODO: 別タスクで testcontainers の PostgreSQL に移行する。
//       それまでは TEST_DATABASE_URL(ローカル用 Neon branch)が設定されている場合のみ実行される。
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

import { getPrismaClient } from "../../db/client.js";
import { gachaPoolKeys } from "../shared/literals/gacha-pool-key.js";
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

	it("pool の候補を検証済みで読み出す", async () => {
		await getPrismaClient().gachaEntity.createMany({
			data: [
				{ poolKey, name, rarity: "COMMON" },
				{ poolKey, name: anotherName, rarity: "RARE" },
			],
		});

		const entities = await gachaEntityRepository.findMany({ poolKey });
		expect(entities).toContainEqual({ rarity: "COMMON", name });
		expect(entities).toContainEqual({ rarity: "RARE", name: anotherName });
	});

	it("保存済み rarity が schema に違反していれば読み込みを失敗させる", async () => {
		await getPrismaClient().gachaEntity.create({
			data: { poolKey, name: invalidRarityName, rarity: "LEGENDARY" },
		});

		await expect(
			gachaEntityRepository.findMany({ poolKey }),
		).rejects.toBeInstanceOf(z.ZodError);
	});
});
