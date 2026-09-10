import { describe, expect, it } from "vitest";

import {
	buildReminderChoicesMessage,
	buildReminderQuestionMessage,
} from "./reminder-message.js";

describe("buildReminderQuestionMessage", () => {
	it("writes the question mentioning the target user", () => {
		expect(buildReminderQuestionMessage("987654321098765432")).toEqual({
			content: "<@987654321098765432> やおよろ～！今日は遊技した？",
			allowed_mentions: {
				parse: [],
				users: ["987654321098765432"],
			},
		});
	});
});

describe("buildReminderChoicesMessage", () => {
	it("turns the reminder's choices into a button message", () => {
		expect(buildReminderChoicesMessage("987654321098765432")).toEqual({
			components: [
				{
					type: 1,
					components: [
						{
							type: 2,
							style: 3,
							label: "はい（勝った）",
							custom_id: "play-check-reminder:987654321098765432:won",
						},
						{
							type: 2,
							style: 4,
							label: "はい（負けた）",
							custom_id: "play-check-reminder:987654321098765432:lost",
						},
						{
							type: 2,
							style: 2,
							label: "いいえ",
							custom_id: "play-check-reminder:987654321098765432:not-played",
						},
					],
				},
			],
			allowed_mentions: { parse: [] },
		});
	});
});
