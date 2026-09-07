// In scope: saving, deleting and reading a ChannelSetting keyed by applicationKey, settingKey, guildId and userId
// Out of scope: discovering Discord IDs, permission checks, interpreting a settingKey, routing
import { getPrismaClient } from "../../db/client.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
	channelSettingConfigurationSchema,
	discordSnowflakeSchema,
} from "./schema.js";
import type {
	ChannelSetting,
	DeleteChannelSettingInput,
	FindChannelSettingsInput,
	SaveChannelSettingInput,
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
	/** Saves the setting for one guild and target user, returning it as stored. */
	save: async (input: SaveChannelSettingInput): Promise<ChannelSetting> => {
		const configuration = channelSettingConfigurationSchema.parse({
			version: 1,
			channelId: input.channelId,
		});
		const guildId = discordSnowflakeSchema.parse(input.guildId);
		const userId = discordSnowflakeSchema.parse(input.userId);
		const prisma = getPrismaClient();
		const row = await prisma.discordUserSetting.upsert({
			where: {
				applicationKey_guildId_userId_settingKey: {
					applicationKey: input.applicationKey,
					guildId,
					userId,
					settingKey: input.settingKey,
				},
			},
			create: {
				applicationKey: input.applicationKey,
				guildId,
				userId,
				settingKey: input.settingKey,
				configuration,
			},
			update: { configuration },
			select: channelSettingSelect,
		});

		return toChannelSetting(row);
	},

	/** Returns the deleted setting, or null when there was nothing to delete. */
	deleteByGuildIdAndUserId: async (
		input: DeleteChannelSettingInput,
	): Promise<ChannelSetting | null> => {
		const guildId = discordSnowflakeSchema.parse(input.guildId);
		const userId = discordSnowflakeSchema.parse(input.userId);
		const prisma = getPrismaClient();
		try {
			const row = await prisma.discordUserSetting.delete({
				where: {
					applicationKey_guildId_userId_settingKey: {
						applicationKey: input.applicationKey,
						guildId,
						userId,
						settingKey: input.settingKey,
					},
				},
				select: channelSettingSelect,
			});

			return toChannelSetting(row);
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2025"
			) {
				return null;
			}
			throw error;
		}
	},

	/** Validates the stored settings and returns them in a stable order. */
	findMany: async (
		input: FindChannelSettingsInput,
	): Promise<ChannelSetting[]> => {
		const prisma = getPrismaClient();
		const rows = await prisma.discordUserSetting.findMany({
			where: {
				applicationKey: input.applicationKey,
				settingKey: input.settingKey,
			},
			orderBy: [{ guildId: "asc" }, { userId: "asc" }],
			select: channelSettingSelect,
		});

		return rows.map(toChannelSetting);
	},
};
