import { describe, expect, it } from "vitest";

import { autocompleteOperation } from "./autocomplete-operation.js";

describe("autocompleteOperation", () => {
	it("returns OK and an empty candidate-list payload", () => {
		expect(autocompleteOperation()).toEqual({
			kind: "OK",
			data: {
				type: 8,
				data: { choices: [] },
			},
		});
	});
});
