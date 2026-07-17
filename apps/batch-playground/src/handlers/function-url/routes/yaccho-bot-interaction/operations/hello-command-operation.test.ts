import { describe, expect, it } from "vitest";

import { helloCommandOperation } from "./hello-command-operation.js";

describe("helloCommandOperation", () => {
	it("OK と挨拶メッセージ payload を返す", () => {
		expect(helloCommandOperation()).toEqual({
			kind: "OK",
			data: {
				type: 4,
				data: {
					content: "やおよろ～🌚",
					allowed_mentions: { parse: [] },
				},
			},
		});
	});
});
