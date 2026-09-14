import { describe, expect, it } from "vitest";
import { sendInTurn } from "./send-in-turn.js";

describe("sendInTurn", () => {
	it("waits for each request to settle before sending the next", async () => {
		const events: string[] = [];

		await sendInTurn({
			ids: ["a", "b", "c"],
			send: async (id) => {
				events.push(`start ${id}`);
				await new Promise((resolve) => {
					setTimeout(resolve, 1);
				});
				events.push(`end ${id}`);

				return { status: 204, data: undefined };
			},
			onSettled: () => {},
		});

		expect(events).toEqual([
			"start a",
			"end a",
			"start b",
			"end b",
			"start c",
			"end c",
		]);
	});

	it("keeps going past a failure and reports only the ids that went through", async () => {
		let settled = 0;
		const result = await sendInTurn({
			ids: ["a", "b", "c"],
			send: async (id) => {
				if (id === "a") {
					return { status: 404, data: { message: "そのメディアはありません" } };
				}

				if (id === "b") {
					throw new Error("Failed to fetch");
				}

				return { status: 200, data: { logicalPath: "photos" } };
			},
			onSettled: () => {
				settled += 1;
			},
		});

		expect(result).toEqual({
			succeededIds: ["c"],
			failures: ["そのメディアはありません", "Failed to fetch"],
		});
		expect(settled).toBe(3);
	});
});
