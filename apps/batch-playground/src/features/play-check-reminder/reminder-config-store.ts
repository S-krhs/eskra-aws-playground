// In scope: 遊技チェックリマインダーの利用者設定を汎用 Discord 利用者設定 repository へ束ねて保存/削除/取得する
// Out of scope: DB 操作の詳細、routing、メッセージ生成、押下結果の判定
import type { DiscordUserSettingKey } from "@eskra-aws-playground/repositories/playground/discord-user-setting/repository.js";
import { discordUserSettingRepository } from "@eskra-aws-playground/repositories/playground/discord-user-setting/repository.js";
import { applicationKeys } from "@eskra-aws-playground/repositories/playground/shared/literals/application-key.js";
import { settingKeys } from "@eskra-aws-playground/repositories/playground/shared/literals/setting-key.js";
import { z } from "zod";

const configKey: DiscordUserSettingKey = {
	applicationKey: applicationKeys.yacchoBot,
	settingKey: settingKeys.playCheckReminder,
};

const discordSnowflakeSchema = z.string().regex(/^[0-9]{1,20}$/);

/** 遊技チェックリマインダーの JSONB configuration schema。 */
const reminderConfigurationSchema = z
	.object({
		version: z.literal(1),
		channelId: discordSnowflakeSchema,
	})
	.strict();

/** Guild・対象利用者ごとの遊技チェックリマインダー配信設定。 */
export interface ReminderConfig {
	guildId: string;
	channelId: string;
	userId: string;
}

/** 遊技チェックリマインダー配信設定の保存入力。 */
export interface SaveReminderConfigInput {
	guildId: string;
	channelId: string;
	userId: string;
}

/** 遊技チェックリマインダー配信設定の永続化操作。 */
export const reminderConfigStore = {
	/** Guild・対象利用者の設定を保存する。同じ対象利用者の設定があれば上書きする。 */
	save: async (input: SaveReminderConfigInput): Promise<void> => {
		await discordUserSettingRepository.save({
			key: configKey,
			guildId: input.guildId,
			userId: input.userId,
			configuration: { version: 1, channelId: input.channelId },
			configurationSchema: reminderConfigurationSchema,
		});
	},

	/** Guild・対象利用者の設定を削除し、削除対象が存在したかを返す。 */
	deleteByGuildIdAndUserId: async (
		guildId: string,
		userId: string,
	): Promise<boolean> => {
		return discordUserSettingRepository.deleteByGuildIdAndUserId({
			key: configKey,
			guildId,
			userId,
		});
	},

	/** 登録済みの Guild・対象利用者設定を安定した順序で返す。 */
	findMany: async (): Promise<ReminderConfig[]> => {
		const settings = await discordUserSettingRepository.findMany({
			key: configKey,
			configurationSchema: reminderConfigurationSchema,
		});

		return settings.map((setting) => {
			return {
				guildId: setting.guildId,
				channelId: setting.configuration.channelId,
				userId: setting.userId,
			};
		});
	},
};
