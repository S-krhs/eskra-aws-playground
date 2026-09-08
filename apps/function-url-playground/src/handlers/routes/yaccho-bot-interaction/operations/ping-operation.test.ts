import { describe, expect, it } from "vitest";

import { pingOperation } from "./ping-operation.js";

describe("pingOperation", () => {
	it("returns OK and the PONG payload", () => {
		expect(pingOperation()).toEqual({
			kind: "OK",
			data: { type: 1 },
		});
	});
});
