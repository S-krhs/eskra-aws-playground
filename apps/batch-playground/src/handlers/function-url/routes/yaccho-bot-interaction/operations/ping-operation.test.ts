import { describe, expect, it } from "vitest";

import { pingOperation } from "./ping-operation.js";

describe("pingOperation", () => {
	it("OK と PONG payload を返す", () => {
		expect(pingOperation()).toEqual({
			kind: "OK",
			data: { type: 1 },
		});
	});
});
