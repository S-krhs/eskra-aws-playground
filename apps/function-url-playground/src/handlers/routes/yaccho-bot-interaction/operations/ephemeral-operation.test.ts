import { describe, expect, it } from "vitest";

import { ephemeralOperation } from "./ephemeral-operation.js";

describe("ephemeralOperation", () => {
	it("OK と呼び出し元だけに表示するメッセージ payload を返す", () => {
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
