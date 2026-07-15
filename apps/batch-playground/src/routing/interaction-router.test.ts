import { describe, expect, it } from "vitest";

import { resolveComponentInteraction } from "./interaction-router.js";

describe("resolveComponentInteraction", () => {
	it("play-check-reminder prefix の選択押下は update-message を返す", () => {
		expect(
			resolveComponentInteraction("play-check-reminder:123:won", "123"),
		).toEqual({
			kind: "update-message",
			content:
				"<@123> 今日は遊技をしましたか？\n**はい（勝った）** を選択しました",
		});
	});

	it("対象外ユーザーの押下は ephemeral を返す", () => {
		expect(
			resolveComponentInteraction("play-check-reminder:123:won", "999"),
		).toEqual({
			kind: "ephemeral",
			content: "このリマインダーは <@123> さん専用です。",
		});
	});

	it("未登録の prefix は unsupported を返す", () => {
		expect(resolveComponentInteraction("other-feature:123:won", "123")).toEqual(
			{ kind: "unsupported" },
		);
	});

	it("separator を含まない custom_id は unsupported を返す", () => {
		expect(resolveComponentInteraction("play-check-reminder", "123")).toEqual({
			kind: "unsupported",
		});
	});

	it("feature が解釈できない payload は unsupported を返す", () => {
		expect(
			resolveComponentInteraction("play-check-reminder:123:maybe", "123"),
		).toEqual({ kind: "unsupported" });
	});
});
