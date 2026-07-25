import { describe, expect, it } from "vitest";

import { parseInteractionCallback } from "./parse-interaction-callback.js";

describe("parseInteractionCallback", () => {
	it("callback として application_id と token を取り出す", () => {
		expect(
			parseInteractionCallback(
				'{"type":2,"application_id":"999","token":"abc-token","data":{"name":"hello"}}',
			),
		).toEqual({ applicationId: "999", token: "abc-token" });
	});

	it("application_id か token を欠く body の callback は取り出さない", () => {
		expect(
			parseInteractionCallback('{"type":2,"token":"abc"}'),
		).toBeUndefined();
		expect(
			parseInteractionCallback('{"type":2,"application_id":"999","token":""}'),
		).toBeUndefined();
		expect(parseInteractionCallback("not-a-json")).toBeUndefined();
	});
});
