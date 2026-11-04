import { describe, expect, it } from "vitest";

import { type ChannelAssignment, isAssigned } from "./channel-assignments.js";

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
const ofAnotherBot: ChannelAssignment = {
	...assignment,
	applicationKey: "kaguya-bot",
};

describe("isAssigned", () => {
	it("finds the same bot feature for the same user in the same channel", () => {
		expect(isAssigned([inAnotherChannel, { ...assignment }], assignment)).toBe(
			true,
		);
	});

	it("doesn't count another channel, another user or another bot as assigned", () => {
		expect(
			isAssigned([inAnotherChannel, forAnotherUser, ofAnotherBot], assignment),
		).toBe(false);
		expect(isAssigned([], assignment)).toBe(false);
	});
});
