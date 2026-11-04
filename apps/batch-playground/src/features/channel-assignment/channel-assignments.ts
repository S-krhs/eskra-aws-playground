// In scope: the list of which bot feature is assigned to which Discord channel for which user, and when two entries are the same assignment
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

const isSameAssignment = (
	left: ChannelAssignment,
	right: ChannelAssignment,
): boolean => {
	return (
		left.applicationKey === right.applicationKey &&
		left.settingKey === right.settingKey &&
		left.guildId === right.guildId &&
		left.channelId === right.channelId &&
		left.userId === right.userId
	);
};

export const isAssigned = (
	assignments: readonly ChannelAssignment[],
	candidate: ChannelAssignment,
): boolean => {
	return assignments.some((assignment) => {
		return isSameAssignment(assignment, candidate);
	});
};

/**
 * Keeps the first of each repeated assignment, in order. Storage holds no unique key, so two enables
 * racing each other (or one queue message delivered twice) can leave a repeat behind.
 */
export const toDistinctAssignments = (
	assignments: readonly ChannelAssignment[],
): ChannelAssignment[] => {
	return assignments.filter((assignment, index) => {
		return (
			assignments.findIndex((other) => {
				return isSameAssignment(other, assignment);
			}) === index
		);
	});
};
