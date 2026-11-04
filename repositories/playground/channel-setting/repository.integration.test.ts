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
import { applicationKeys } from "../_shared/literals/application-key.js";
import { settingKeys } from "../_shared/literals/setting-key.js";
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
const anotherChannelId = `${testId}12`;

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

		it("inserts the JSON setting for a channel and target user and reads it back validated", async () => {
			await expect(
				channelSettingRepository.insert({
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

			const row = await getPrismaClient().discordUserSetting.findFirst({
				where: {
					applicationKey,
					guildId,
					userId,
					settingKey,
				},
			});
			expect(row?.configuration).toEqual({ version: 1, channelId });
		});

		it("keeps another channel in the same guild as its own row, and narrows the read to one target user", async () => {
			await channelSettingRepository.insert({
				applicationKey,
				settingKey,
				guildId,
				channelId,
				userId,
			});
			await channelSettingRepository.insert({
				applicationKey,
				settingKey,
				guildId,
				channelId: anotherChannelId,
				userId,
			});
			await channelSettingRepository.insert({
				applicationKey,
				settingKey,
				guildId,
				channelId,
				userId: anotherUserId,
			});

			await expect(
				channelSettingRepository.findMany({
					applicationKey,
					settingKey,
					userId,
				}),
			).resolves.toEqual([
				{ guildId, channelId, userId },
				{ guildId, channelId: anotherChannelId, userId },
			]);
		});

		it("inserts the same channel and target user again instead of rejecting it", async () => {
			const input = {
				applicationKey,
				settingKey,
				guildId,
				channelId,
				userId,
			};
			await channelSettingRepository.insert(input);
			await channelSettingRepository.insert(input);

			await expect(
				channelSettingRepository.findMany({
					applicationKey,
					settingKey,
					userId,
				}),
			).resolves.toEqual([
				{ guildId, channelId, userId },
				{ guildId, channelId, userId },
			]);
		});

		it("deletes only that channel's rows for the target user and reports how many", async () => {
			const input = {
				applicationKey,
				settingKey,
				guildId,
				channelId,
				userId,
			};
			await channelSettingRepository.insert(input);
			await channelSettingRepository.insert(input);
			await channelSettingRepository.insert({
				...input,
				channelId: anotherChannelId,
			});
			await channelSettingRepository.insert({
				...input,
				userId: anotherUserId,
			});

			await expect(
				channelSettingRepository.deleteByChannelIdAndUserId({
					applicationKey,
					settingKey,
					channelId,
					userId,
				}),
			).resolves.toBe(2);
			await expect(
				channelSettingRepository.deleteByChannelIdAndUserId({
					applicationKey,
					settingKey,
					channelId,
					userId,
				}),
			).resolves.toBe(0);

			const rows = await getPrismaClient().discordUserSetting.findMany({
				where: { applicationKey, guildId, settingKey },
				select: { userId: true, configuration: true },
				orderBy: { id: "asc" },
			});
			expect(rows).toEqual([
				{
					userId,
					configuration: { version: 1, channelId: anotherChannelId },
				},
				{ userId: anotherUserId, configuration: { version: 1, channelId } },
			]);
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
				channelSettingRepository.insert({
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
