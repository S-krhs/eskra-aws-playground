// In scope: the list of which bot feature is assigned to which Discord channel for which user, and whether an assignment is already in it
// Out of scope: reading or writing where assignments are stored, Discord API calls, building messages
import type { ApplicationKey } from "@eskra-aws-playground/repositories/playground/_shared/literals/application-key.js";
import type { SettingKey } from "@eskra-aws-playground/repositories/playground/_shared/literals/setting-key.js";

/** One bot feature put to work in a Discord channel for one user. */
export interface ChannelAssignment {
	applicationKey: ApplicationKey;
	settingKey: SettingKey;
	guildId: string;
	channelId: string;
	userId: string;
}

export const isAssigned = (
	assignments: readonly ChannelAssignment[],
	candidate: ChannelAssignment,
): boolean => {
	return assignments.some((assignment) => {
		return (
			assignment.applicationKey === candidate.applicationKey &&
			assignment.settingKey === candidate.settingKey &&
			assignment.guildId === candidate.guildId &&
			assignment.channelId === candidate.channelId &&
			assignment.userId === candidate.userId
		);
	});
};
