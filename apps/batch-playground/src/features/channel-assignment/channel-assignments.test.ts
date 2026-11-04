import { describe, expect, it } from "vitest";

import {
	type ChannelAssignment,
	isAssigned,
	toDistinctAssignments,
} from "./channel-assignments.js";

const assignment: ChannelAssignment = {
	applicationKey: "yaccho-bot",
	settingKey: "play-check-reminder",
	guildId: "1",
	channelId: "11",
	userId: "111",
};
const inAnotherChannel: ChannelAssignment = {
	...assignment,
	channelId: "12",
};
const forAnotherUser: ChannelAssignment = { ...assignment, userId: "112" };

describe("isAssigned", () => {
	it("finds the same bot feature for the same user in the same channel", () => {
		expect(isAssigned([inAnotherChannel, { ...assignment }], assignment)).toBe(
			true,
		);
	});

	it("doesn't count another channel or another user as assigned", () => {
		expect(isAssigned([inAnotherChannel, forAnotherUser], assignment)).toBe(
			false,
		);
		expect(isAssigned([], assignment)).toBe(false);
	});
});

describe("toDistinctAssignments", () => {
	it("keeps the first of each repeat and the order of the rest", () => {
		expect(
			toDistinctAssignments([
				assignment,
				inAnotherChannel,
				{ ...assignment },
				forAnotherUser,
				{ ...inAnotherChannel },
			]),
		).toEqual([assignment, inAnotherChannel, forAnotherUser]);
	});
});
