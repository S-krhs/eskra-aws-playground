import { describe, expect, it } from "vitest";

import { parseInteractionCallback } from "./parse-interaction-callback.js";

describe("parseInteractionCallback", () => {
	it("extracts application_id and token as the callback", () => {
		expect(
			parseInteractionCallback(
				'{"type":2,"application_id":"999","token":"abc-token","data":{"name":"hello"}}',
			),
		).toEqual({ applicationId: "999", token: "abc-token" });
	});

	it("doesn't extract a callback from a body missing application_id or token", () => {
		expect(
			parseInteractionCallback('{"type":2,"token":"abc"}'),
		).toBeUndefined();
		expect(
			parseInteractionCallback('{"type":2,"application_id":"999","token":""}'),
		).toBeUndefined();
		expect(parseInteractionCallback("not-a-json")).toBeUndefined();
	});
});
