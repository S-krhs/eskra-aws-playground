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

import { getPrismaClient } from "../../db/client.js";
import { applicationKeys } from "../shared/literals/application-key.js";
import { settingKeys } from "../shared/literals/setting-key.js";
import { channelSettingRepository } from "./repository.js";

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

const applicationKey = applicationKeys.yacchoBot;
const settingKey = settingKeys.playCheckReminder;

const deleteTestRows = async (): Promise<void> => {
	const prisma = getPrismaClient();
	await prisma.discordUserSetting.deleteMany({
		where: {
			applicationKey,
			guildId: { in: guildIds },
			settingKey,
		},
	});
};

describe.skipIf(!testDatabaseUrl)(
	"channelSettingRepository (integration)",
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

		it("saves the JSON setting for a guild and target user and reads it back validated", async () => {
			await expect(
				channelSettingRepository.save({
					applicationKey,
					settingKey,
					guildId,
					channelId,
					userId,
				}),
			).resolves.toEqual({ guildId, channelId, userId });

			const settings = await channelSettingRepository.findMany({
				applicationKey,
				settingKey,
			});
			expect(settings).toContainEqual({
				guildId,
				channelId,
				userId,
			});

			const row = await getPrismaClient().discordUserSetting.findUnique({
				where: {
					applicationKey_guildId_userId_settingKey: {
						applicationKey,
						guildId,
						userId,
						settingKey,
					},
				},
			});
			expect(row?.configuration).toEqual({ version: 1, channelId });
		});

		it("overwrites the same guild and target user in place, still one row", async () => {
			await channelSettingRepository.save({
				applicationKey,
				settingKey,
				guildId,
				channelId,
				userId,
			});
			await channelSettingRepository.save({
				applicationKey,
				settingKey,
				guildId,
				channelId: `${testId}12`,
				userId,
			});

			const rows = await getPrismaClient().discordUserSetting.findMany({
				where: {
					applicationKey,
					guildId,
					userId,
					settingKey,
				},
			});
			expect(rows).toHaveLength(1);
			expect(rows[0]?.configuration).toEqual({
				version: 1,
				channelId: `${testId}12`,
			});
		});

		it("saves and deletes another user in the same guild independently", async () => {
			await channelSettingRepository.save({
				applicationKey,
				settingKey,
				guildId,
				channelId,
				userId,
			});
			await channelSettingRepository.save({
				applicationKey,
				settingKey,
				guildId,
				channelId: `${testId}12`,
				userId: anotherUserId,
			});

			await expect(
				channelSettingRepository.deleteByGuildIdAndUserId({
					applicationKey,
					settingKey,
					guildId,
					userId,
				}),
			).resolves.toEqual({ guildId, channelId, userId });

			const settings = await channelSettingRepository.findMany({
				applicationKey,
				settingKey,
			});
			expect(
				settings.map((setting) => {
					return setting.userId;
				}),
			).toEqual([anotherUserId]);
		});

		it("deletes the setting and reports whether there was one to delete", async () => {
			await channelSettingRepository.save({
				applicationKey,
				settingKey,
				guildId,
				channelId,
				userId,
			});

			await expect(
				channelSettingRepository.deleteByGuildIdAndUserId({
					applicationKey,
					settingKey,
					guildId,
					userId,
				}),
			).resolves.toEqual({ guildId, channelId, userId });
			await expect(
				channelSettingRepository.deleteByGuildIdAndUserId({
					applicationKey,
					settingKey,
					guildId,
					userId,
				}),
			).resolves.toBeNull();
		});

		it("fails the read when stored JSON violates the schema", async () => {
			await getPrismaClient().discordUserSetting.create({
				data: {
					applicationKey,
					guildId: invalidGuildId,
					userId: `${testId}23`,
					settingKey,
					configuration: { version: 1, channelId, extra: true },
				},
			});

			await expect(
				channelSettingRepository.findMany({
					applicationKey,
					settingKey,
				}),
			).rejects.toBeInstanceOf(z.ZodError);
		});

		it("fails invalid input before it reaches the DB", async () => {
			await expect(
				channelSettingRepository.save({
					applicationKey,
					settingKey,
					guildId: "not-a-snowflake",
					channelId,
					userId,
				}),
			).rejects.toBeInstanceOf(z.ZodError);

			const count = await getPrismaClient().discordUserSetting.count({
				where: {
					applicationKey,
					guildId: { in: [guildId, anotherGuildId] },
					settingKey,
				},
			});
			expect(count).toBe(0);
		});
	},
);
