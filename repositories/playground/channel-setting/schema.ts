// In scope: validating a ChannelSetting's Discord IDs and JSON configuration
// Out of scope: DB access, discovering Discord IDs, interpreting a settingKey
import { z } from "zod";

export const discordSnowflakeSchema = z.string().regex(/^[0-9]{1,20}$/);

/** Shape of the JSONB configuration column on a ChannelSetting row. */
export const channelSettingConfigurationSchema = z
	.object({
		version: z.literal(1),
		channelId: discordSnowflakeSchema,
	})
	.strict();
