import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { planOneTimeInvocation } from "./one-time-invocation-plan.js";

describe("planOneTimeInvocation", () => {
	beforeEach(() => {
		// Pinned to JST 2026-07-14 00:00
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-07-13T15:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("plans the window's opening JST 12:00 at the smallest random", () => {
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

	it("never goes past the window's closing JST 17:59, even near the largest random", () => {
		expect(
			planOneTimeInvocation(() => {
				return 0.999999;
			}).scheduleAt,
		).toBe("2026-07-14T17:59:00");
	});

	it("picks from now+1 minute onward when run after the window opens", () => {
		// JST 2026-07-14 14:00
		vi.setSystemTime(new Date("2026-07-14T05:00:00Z"));

		expect(
			planOneTimeInvocation(() => {
				return 0;
			}).scheduleAt,
		).toBe("2026-07-14T14:01:00");
	});

	it("still never goes past JST 17:59 when run after the window opens", () => {
		// JST 2026-07-14 14:00
		vi.setSystemTime(new Date("2026-07-14T05:00:00Z"));

		expect(
			planOneTimeInvocation(() => {
				return 0.999999;
			}).scheduleAt,
		).toBe("2026-07-14T17:59:00");
	});

	it("errors when run after the window closes", () => {
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
