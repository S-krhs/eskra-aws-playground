import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { planOneTimeInvocation } from "./one-time-invocation-plan.js";

describe("planOneTimeInvocation", () => {
	beforeEach(() => {
		// JST 2026-07-14 00:00 に固定する
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-13T15:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("random が最小のとき window 先頭の JST 12:00 を計画する", () => {
		expect(
			planOneTimeInvocation(() => {
				return 0;
			}),
		).toEqual({
			scheduleName: "uma-one-draw-topic-2026-07-14",
			scheduleAt: "2026-07-14T12:00:00",
			timezone: "Asia/Tokyo",
		});
	});

	it("random が最大近くでも window 末尾の JST 17:59 を超えない", () => {
		expect(
			planOneTimeInvocation(() => {
				return 0.999999;
			}).scheduleAt,
		).toBe("2026-07-14T17:59:00");
	});

	it("window 開始後の実行では今+1分以降から選ぶ", () => {
		// JST 2026-07-14 14:00
		vi.setSystemTime(new Date("2026-07-14T05:00:00Z"));

		expect(
			planOneTimeInvocation(() => {
				return 0;
			}).scheduleAt,
		).toBe("2026-07-14T14:01:00");
	});

	it("window 開始後でも末尾の JST 17:59 を超えない", () => {
		// JST 2026-07-14 14:00
		vi.setSystemTime(new Date("2026-07-14T05:00:00Z"));

		expect(
			planOneTimeInvocation(() => {
				return 0.999999;
			}).scheduleAt,
		).toBe("2026-07-14T17:59:00");
	});

	it("window 終了後の実行はエラーにする", () => {
		// JST 2026-07-14 18:30
		vi.setSystemTime(new Date("2026-07-14T09:30:00Z"));

		expect(() => {
			planOneTimeInvocation(() => {
				return 0;
			});
		}).toThrow(
			"当日の起動 window を過ぎているため schedule を登録できません。",
		);
	});
});
