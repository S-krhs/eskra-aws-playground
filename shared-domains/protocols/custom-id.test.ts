import { describe, expect, it } from "vitest";

import { buildCustomId, parseCustomId } from "./custom-id.js";

describe("Discord custom ID", () => {
	it("prefix・target・action から custom_id を生成する", () => {
		expect(
			buildCustomId({
				prefix: "play-check-reminder",
				target: "123",
				action: "won",
			}),
		).toBe("play-check-reminder:123:won");
	});

	it("target 未指定時は2番目を空の区画として生成する", () => {
		expect(
			buildCustomId({
				prefix: "refresh-panel",
				action: "refresh",
			}),
		).toBe("refresh-panel::refresh");
	});

	it("custom_id を prefix・target・action に分解する", () => {
		expect(parseCustomId("play-check-reminder:123:won")).toEqual({
			prefix: "play-check-reminder",
			target: "123",
			action: "won",
		});
	});

	it("空の2番目の区画は target 未指定として分解する", () => {
		expect(parseCustomId("refresh-panel::refresh")).toEqual({
			prefix: "refresh-panel",
			action: "refresh",
		});
	});

	it("3区画でないか必須区画がない custom_id は分解しない", () => {
		expect(parseCustomId("")).toBeUndefined();
		expect(parseCustomId(":123:won")).toBeUndefined();
		expect(parseCustomId("refresh")).toBeUndefined();
		expect(parseCustomId("refresh-panel::")).toBeUndefined();
		expect(parseCustomId("prefix:target:action:extra")).toBeUndefined();
	});

	it("必須区画の欠落または区切り文字を含む値からは生成しない", () => {
		expect(() => {
			buildCustomId({ prefix: "", action: "refresh" });
		}).toThrow("custom_id の segment が不正です。");
		expect(() => {
			buildCustomId({ prefix: "panel", action: "page:next" });
		}).toThrow("custom_id の segment が不正です。");
	});
});
