// In scope: the input/output types of the ChannelSetting repository
// Out of scope: validation schemas, DB access, interpreting a settingKey
import type { ApplicationKey } from "../shared/literals/application-key.js";
import type { SettingKey } from "../shared/literals/setting-key.js";

/** The Discord channel setting for one guild and target user. */
export interface ChannelSetting {
	guildId: string;
	channelId: string;
	userId: string;
}

export interface SaveChannelSettingInput {
	applicationKey: ApplicationKey;
	settingKey: SettingKey;
	guildId: string;
	channelId: string;
	userId: string;
}

export interface DeleteChannelSettingInput {
	applicationKey: ApplicationKey;
	settingKey: SettingKey;
	guildId: string;
	userId: string;
}

export interface FindChannelSettingsInput {
	applicationKey: ApplicationKey;
	settingKey: SettingKey;
}
