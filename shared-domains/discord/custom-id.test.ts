import { describe, expect, it } from "vitest";

import { buildCustomId, parseCustomId } from "./custom-id.js";

describe("Discord custom ID", () => {
	it("builds a custom_id from prefix, target and action", () => {
		expect(
			buildCustomId({
				prefix: "play-check-reminder",
				target: "123",
				action: "won",
			}),
		).toBe("play-check-reminder:123:won");
	});

	it("leaves the second segment empty when no target is given", () => {
		expect(
			buildCustomId({
				prefix: "refresh-panel",
				action: "refresh",
			}),
		).toBe("refresh-panel::refresh");
	});

	it("splits a custom_id into prefix, target and action", () => {
		expect(parseCustomId("play-check-reminder:123:won")).toEqual({
			prefix: "play-check-reminder",
			target: "123",
			action: "won",
		});
	});

	it("reads an empty second segment as no target", () => {
		expect(parseCustomId("refresh-panel::refresh")).toEqual({
			prefix: "refresh-panel",
			action: "refresh",
		});
	});

	it("does not split a custom_id without three segments or missing a required one", () => {
		expect(parseCustomId("")).toBeUndefined();
		expect(parseCustomId(":123:won")).toBeUndefined();
		expect(parseCustomId("refresh")).toBeUndefined();
		expect(parseCustomId("refresh-panel::")).toBeUndefined();
		expect(parseCustomId("prefix:target:action:extra")).toBeUndefined();
	});

	it("refuses to build from a missing required segment or one containing the separator", () => {
		expect(() => {
			buildCustomId({ prefix: "", action: "refresh" });
		}).toThrow("custom_id の segment が不正です。");
		expect(() => {
			buildCustomId({ prefix: "panel", action: "page:next" });
		}).toThrow("custom_id の segment が不正です。");
	});
});
