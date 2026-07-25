import { describe, expect, it } from "vitest";
import { ephemeralOperation } from "./ephemeral-operation.js";

describe("ephemeralOperation", () => {
	it("OK と呼び出し元だけに表示するメッセージ payload を返す", () => {
		expect(ephemeralOperation("この操作には対応していません。")).toEqual({
			kind: "OK",
			data: {
				type: 4,
				data: {
					content: "この操作には対応していません。",
					flags: 64,
					allowed_mentions: { parse: [] },
				},
			},
		});
	});
});
