// In scope: applicationKey・settingKey・guildId・userId で識別する Discord 利用者設定の保存/削除/取得と Discord ID の検証
// Out of scope: configuration の用途固有 schema、Discord ID の発見、権限検証、routing
import { z } from "zod";
import { getPrismaClient } from "../../db/client.js";
import type { ApplicationKey } from "../shared/literals/application-key.js";
import type { SettingKey } from "../shared/literals/setting-key.js";

/** Discord Snowflake 文字列の schema。 */
const discordSnowflakeSchema = z.string().regex(/^[0-9]{1,20}$/);

/** applicationKey・settingKey で束ねた Discord 利用者設定の識別子。 */
export interface DiscordUserSettingKey {
	applicationKey: ApplicationKey;
	settingKey: SettingKey;
}

/** Guild・対象利用者ごとの Discord 利用者設定。configuration は呼び出し側の schema で検証する。 */
export interface DiscordUserSetting<Configuration> {
	guildId: string;
	userId: string;
	configuration: Configuration;
}

/** Discord 利用者設定の永続化操作。configuration の用途固有 schema は呼び出し側が渡す。 */
export const discordUserSettingRepository = {
	/** Guild・対象利用者の設定を保存する。同じ対象利用者の設定があれば上書きする。 */
	save: async (input: {
		key: DiscordUserSettingKey;
		guildId: string;
		userId: string;
		configuration: unknown;
		configurationSchema: z.ZodTypeAny;
	}): Promise<void> => {
		const configuration = input.configurationSchema.parse(input.configuration);
		const guildId = discordSnowflakeSchema.parse(input.guildId);
		const userId = discordSnowflakeSchema.parse(input.userId);
		const prisma = getPrismaClient();
		await prisma.discordUserSetting.upsert({
			where: {
				applicationKey_guildId_userId_settingKey: {
					applicationKey: input.key.applicationKey,
					guildId,
					userId,
					settingKey: input.key.settingKey,
				},
			},
			create: {
				applicationKey: input.key.applicationKey,
				guildId,
				userId,
				settingKey: input.key.settingKey,
				configuration,
			},
			update: { configuration },
		});
	},

	/** Guild・対象利用者の設定を削除し、削除対象が存在したかを返す。 */
	deleteByGuildIdAndUserId: async (input: {
		key: DiscordUserSettingKey;
		guildId: string;
		userId: string;
	}): Promise<boolean> => {
		const guildId = discordSnowflakeSchema.parse(input.guildId);
		const userId = discordSnowflakeSchema.parse(input.userId);
		const prisma = getPrismaClient();
		const result = await prisma.discordUserSetting.deleteMany({
			where: {
				applicationKey: input.key.applicationKey,
				guildId,
				userId,
				settingKey: input.key.settingKey,
			},
		});

		return result.count > 0;
	},

	/** 登録済みの Guild・対象利用者設定を検証し、安定した順序で返す。 */
	findMany: async <Configuration>(input: {
		key: DiscordUserSettingKey;
		configurationSchema: z.ZodType<Configuration>;
	}): Promise<DiscordUserSetting<Configuration>[]> => {
		const prisma = getPrismaClient();
		const rows = await prisma.discordUserSetting.findMany({
			where: {
				applicationKey: input.key.applicationKey,
				settingKey: input.key.settingKey,
			},
			orderBy: [{ guildId: "asc" }, { userId: "asc" }],
			select: { guildId: true, userId: true, configuration: true },
		});

		return rows.map((row) => {
			return {
				guildId: discordSnowflakeSchema.parse(row.guildId),
				userId: discordSnowflakeSchema.parse(row.userId),
				configuration: input.configurationSchema.parse(row.configuration),
			};
		});
	},
};
