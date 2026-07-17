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
import { applicationKeys } from "../shared/literals/application-key.js";
import { settingKeys } from "../shared/literals/setting-key.js";
import { discordUserSettingRepository } from "./repository.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testId = Date.now().toString();
const guildIds = [`${testId}01`, `${testId}02`, `${testId}03`];
const [guildId, anotherGuildId, invalidGuildId] = guildIds as [
	string,
	string,
	string,
];
const userId = `${testId}21`;
const anotherUserId = `${testId}22`;
const channelId = `${testId}11`;

const key = {
	applicationKey: applicationKeys.yacchoBot,
	settingKey: settingKeys.playCheckReminder,
};
const configurationSchema = z
	.object({
		version: z.literal(1),
		channelId: z.string().regex(/^[0-9]{1,20}$/),
	})
	.strict();

const deleteTestRows = async (): Promise<void> => {
	const prisma = getPrismaClient();
	await prisma.discordUserSetting.deleteMany({
		where: {
			applicationKey: key.applicationKey,
			guildId: { in: guildIds },
			settingKey: key.settingKey,
		},
	});
};

describe.skipIf(!testDatabaseUrl)(
	"discordUserSettingRepository (integration)",
	() => {
		beforeAll(() => {
			process.env.DATABASE_URL = testDatabaseUrl;
		});

		beforeEach(deleteTestRows);
		afterEach(deleteTestRows);

		afterAll(async () => {
			await deleteTestRows();
			await getPrismaClient().$disconnect();
		});

		it("Guild・対象利用者ごとの JSON 設定を保存して検証済みで読み戻せる", async () => {
			await discordUserSettingRepository.save({
				key,
				guildId,
				userId,
				configuration: { version: 1, channelId },
				configurationSchema,
			});

			const settings = await discordUserSettingRepository.findMany({
				key,
				configurationSchema,
			});
			expect(settings).toContainEqual({
				guildId,
				userId,
				configuration: { version: 1, channelId },
			});

			const row = await getPrismaClient().discordUserSetting.findUnique({
				where: {
					applicationKey_guildId_userId_settingKey: {
						applicationKey: key.applicationKey,
						guildId,
						userId,
						settingKey: key.settingKey,
					},
				},
			});
			expect(row?.configuration).toEqual({ version: 1, channelId });
		});

		it("同じ Guild・対象利用者の設定を 1 行のまま上書きする", async () => {
			await discordUserSettingRepository.save({
				key,
				guildId,
				userId,
				configuration: { version: 1, channelId },
				configurationSchema,
			});
			await discordUserSettingRepository.save({
				key,
				guildId,
				userId,
				configuration: { version: 1, channelId: `${testId}12` },
				configurationSchema,
			});

			const rows = await getPrismaClient().discordUserSetting.findMany({
				where: {
					applicationKey: key.applicationKey,
					guildId,
					userId,
					settingKey: key.settingKey,
				},
			});
			expect(rows).toHaveLength(1);
			expect(rows[0]?.configuration).toEqual({
				version: 1,
				channelId: `${testId}12`,
			});
		});

		it("同じ Guild の別利用者を独立して保存・削除する", async () => {
			await discordUserSettingRepository.save({
				key,
				guildId,
				userId,
				configuration: { version: 1, channelId },
				configurationSchema,
			});
			await discordUserSettingRepository.save({
				key,
				guildId,
				userId: anotherUserId,
				configuration: { version: 1, channelId: `${testId}12` },
				configurationSchema,
			});

			await expect(
				discordUserSettingRepository.deleteByGuildIdAndUserId({
					key,
					guildId,
					userId,
				}),
			).resolves.toBe(true);

			const settings = await discordUserSettingRepository.findMany({
				key,
				configurationSchema,
			});
			expect(settings.map((setting) => setting.userId)).toEqual([anotherUserId]);
		});

		it("Guild・対象利用者の設定を削除し、削除対象の有無を返す", async () => {
			await discordUserSettingRepository.save({
				key,
				guildId,
				userId,
				configuration: { version: 1, channelId },
				configurationSchema,
			});

			await expect(
				discordUserSettingRepository.deleteByGuildIdAndUserId({
					key,
					guildId,
					userId,
				}),
			).resolves.toBe(true);
			await expect(
				discordUserSettingRepository.deleteByGuildIdAndUserId({
					key,
					guildId,
					userId,
				}),
			).resolves.toBe(false);
		});

		it("保存済み JSON が schema に違反していれば読み込みを失敗させる", async () => {
			await getPrismaClient().discordUserSetting.create({
				data: {
					applicationKey: key.applicationKey,
					guildId: invalidGuildId,
					userId: `${testId}23`,
					settingKey: key.settingKey,
					configuration: { version: 1, channelId, extra: true },
				},
			});

			await expect(
				discordUserSettingRepository.findMany({ key, configurationSchema }),
			).rejects.toBeInstanceOf(z.ZodError);
		});

		it("不正な入力は DB へ保存する前に失敗させる", async () => {
			await expect(
				discordUserSettingRepository.save({
					key,
					guildId: "not-a-snowflake",
					userId,
					configuration: { version: 1, channelId },
					configurationSchema,
				}),
			).rejects.toBeInstanceOf(z.ZodError);

			const count = await getPrismaClient().discordUserSetting.count({
				where: {
					applicationKey: key.applicationKey,
					guildId: { in: [guildId, anotherGuildId] },
					settingKey: key.settingKey,
				},
			});
			expect(count).toBe(0);
		});
	},
);
