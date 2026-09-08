import { describe, expect, it } from "vitest";

import { ephemeralOperation } from "./ephemeral-operation.js";

describe("ephemeralOperation", () => {
	it("returns OK and a message payload visible only to the caller", () => {
		expect(ephemeralOperation("自分で調べろｶｽ")).toEqual({
			kind: "OK",
			data: {
				type: 4,
				data: {
					content: "自分で調べろｶｽ",
					flags: 64,
					allowed_mentions: { parse: [] },
				},
			},
		});
	});
});
