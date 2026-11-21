// In scope: inserting, deleting and reading ChannelSetting rows by applicationKey, settingKey, channelId and userId
// Out of scope: discovering Discord IDs, permission checks, interpreting a settingKey, deciding whether a duplicate row is allowed, routing
import { getPrismaClient } from "../../client/prisma.js";
import {
	channelSettingConfigurationSchema,
	discordSnowflakeSchema,
} from "./schema.js";
import type {
	ChannelSetting,
	DeleteChannelSettingInput,
	FindChannelSettingsInput,
	InsertChannelSettingInput,
} from "./types.js";

interface ChannelSettingRow {
	guildId: string;
	userId: string;
	configuration: unknown;
}

const channelSettingSelect = {
	guildId: true,
	userId: true,
	configuration: true,
} as const;

const toChannelSetting = (row: ChannelSettingRow): ChannelSetting => {
	const configuration = channelSettingConfigurationSchema.parse(
		row.configuration,
	);
	return {
		guildId: discordSnowflakeSchema.parse(row.guildId),
		channelId: configuration.channelId,
		userId: discordSnowflakeSchema.parse(row.userId),
	};
};

export const channelSettingRepository = {
	/**
	 * Inserts one row and returns it as stored. The table holds no unique key, so a row for the same
	 * channel and user is added again rather than rejected.
	 */
	insert: async (input: InsertChannelSettingInput): Promise<ChannelSetting> => {
		const configuration = channelSettingConfigurationSchema.parse({
			version: 1,
			channelId: input.channelId,
		});
		const guildId = discordSnowflakeSchema.parse(input.guildId);
		const userId = discordSnowflakeSchema.parse(input.userId);
		const prisma = getPrismaClient();
		const row = await prisma.discordUserSetting.create({
			data: {
				applicationKey: input.applicationKey,
				guildId,
				userId,
				settingKey: input.settingKey,
				configuration,
			},
			select: channelSettingSelect,
		});

		return toChannelSetting(row);
	},

	/** Deletes every row for this user in this channel and returns how many there were. */
	deleteByChannelIdAndUserId: async (
		input: DeleteChannelSettingInput,
	): Promise<number> => {
		const channelId = discordSnowflakeSchema.parse(input.channelId);
		const userId = discordSnowflakeSchema.parse(input.userId);
		const prisma = getPrismaClient();
		const result = await prisma.discordUserSetting.deleteMany({
			where: {
				applicationKey: input.applicationKey,
				userId,
				settingKey: input.settingKey,
				configuration: { path: ["channelId"], equals: channelId },
			},
		});

		return result.count;
	},

	/** Validates the stored settings and returns them in a stable order. */
	findMany: async (
		input: FindChannelSettingsInput,
	): Promise<ChannelSetting[]> => {
		const prisma = getPrismaClient();
		const rows = await prisma.discordUserSetting.findMany({
			where: {
				applicationKey: input.applicationKey,
				userId: input.userId,
				settingKey: input.settingKey,
			},
			orderBy: [{ guildId: "asc" }, { userId: "asc" }, { id: "asc" }],
			select: channelSettingSelect,
		});

		return rows.map(toChannelSetting);
	},
};
