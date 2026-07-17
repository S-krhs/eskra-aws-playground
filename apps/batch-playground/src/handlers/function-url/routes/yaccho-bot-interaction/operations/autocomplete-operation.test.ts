import { describe, expect, it } from "vitest";

import { autocompleteOperation } from "./autocomplete-operation.js";

describe("autocompleteOperation", () => {
	it("OK と空の候補一覧 payload を返す", () => {
		expect(autocompleteOperation()).toEqual({
			kind: "OK",
			data: {
				type: 8,
				data: { choices: [] },
			},
		});
	});
});
