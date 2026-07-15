import { describe, expect, it } from "vitest";

import {
	buildNotTargetEphemeralContent,
	buildSelectedUpdateContent,
	resolveInteractionSelection,
} from "./interaction-selection.js";

describe("resolveInteractionSelection", () => {
	it("対象ユーザー本人の押下は selected と判定する", () => {
		expect(resolveInteractionSelection("123:won", "123")).toEqual({
			kind: "selected",
			choiceLabel: "はい（勝った）",
			targetUserId: "123",
		});
	});

	it("選択肢ごとのラベルを返す", () => {
		expect(resolveInteractionSelection("123:lost", "123")).toEqual({
			kind: "selected",
			choiceLabel: "はい（負けた）",
			targetUserId: "123",
		});
		expect(resolveInteractionSelection("123:not-played", "123")).toEqual({
			kind: "selected",
			choiceLabel: "いいえ",
			targetUserId: "123",
		});
	});

	it("対象ユーザー以外の押下は not-target と判定する", () => {
		expect(resolveInteractionSelection("123:won", "999")).toEqual({
			kind: "not-target",
			targetUserId: "123",
		});
	});

	it("区切り数が合わない payload は unknown と判定する", () => {
		expect(resolveInteractionSelection("123", "123")).toEqual({
			kind: "unknown",
		});
		expect(resolveInteractionSelection("123:won:extra", "123")).toEqual({
			kind: "unknown",
		});
	});

	it("対象ユーザー ID が空の payload は unknown と判定する", () => {
		expect(resolveInteractionSelection(":won", "")).toEqual({
			kind: "unknown",
		});
	});

	it("未知の選択肢 ID は unknown と判定する", () => {
		expect(resolveInteractionSelection("123:maybe", "123")).toEqual({
			kind: "unknown",
		});
	});
});

describe("buildSelectedUpdateContent", () => {
	it("質問文と選択したラベルを含む本文を生成する", () => {
		expect(buildSelectedUpdateContent("123", "はい（勝った）")).toBe(
			"<@123> 今日は遊技をしましたか？\n**はい（勝った）** を選択しました",
		);
	});
});

describe("buildNotTargetEphemeralContent", () => {
	it("対象ユーザーへのメンション付きで専用リマインダーである旨を生成する", () => {
		expect(buildNotTargetEphemeralContent("123")).toBe(
			"このリマインダーは <@123> さん専用です。",
		);
	});
});
