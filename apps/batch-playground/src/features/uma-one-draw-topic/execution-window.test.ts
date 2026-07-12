import { describe, expect, it } from "vitest";

import {
	isUmaOneDrawTopicExecutionHour,
	resolveExecutionHour,
	toJstDateHour,
} from "./execution-window.js";

describe("toJstDateHour", () => {
	it("UTC の日時を JST の日付キーと時に変換する", () => {
		// UTC 2026-07-11 15:30 は JST 2026-07-12 00:30
		expect(toJstDateHour(new Date("2026-07-11T15:30:00Z"))).toEqual({
			dateKey: "2026-07-12",
			hour: 0,
		});
	});

	it("JST への変換で日付をまたぐ", () => {
		// UTC 2026-07-11 14:59 は JST 2026-07-11 23:59
		expect(toJstDateHour(new Date("2026-07-11T14:59:00Z"))).toEqual({
			dateKey: "2026-07-11",
			hour: 23,
		});
	});
});

describe("resolveExecutionHour", () => {
	it("同じ日付キーなら常に同じ時刻を返す", () => {
		const dateKey = "2026-07-12";

		expect(resolveExecutionHour(dateKey)).toBe(resolveExecutionHour(dateKey));
	});

	it("12 時から 18 時までの範囲に収まる", () => {
		const dateKeys = Array.from({ length: 30 }, (_, day) => {
			return `2026-08-${String(day + 1).padStart(2, "0")}`;
		});

		for (const dateKey of dateKeys) {
			const hour = resolveExecutionHour(dateKey);

			expect(hour).toBeGreaterThanOrEqual(12);
			expect(hour).toBeLessThanOrEqual(18);
		}
	});

	it("日付キーが異なれば選ばれる時刻が変わりうる", () => {
		const dateKeys = Array.from({ length: 30 }, (_, day) => {
			return `2026-09-${String(day + 1).padStart(2, "0")}`;
		});
		const hours = new Set(dateKeys.map(resolveExecutionHour));

		expect(hours.size).toBeGreaterThan(1);
	});
});

// JST 12-18 時は UTC+9 しても日付をまたがない (UTC 3-9 時) ため、
// JST の時から素直に引き算した UTC 時刻で同じ JST 日付を再現できる。
const toUtcDateAtJstHour = (dateKey: string, jstHour: number): Date => {
	const utcHour = jstHour - 9;

	return new Date(`${dateKey}T${String(utcHour).padStart(2, "0")}:00:00Z`);
};

describe("isUmaOneDrawTopicExecutionHour", () => {
	it("実行対象時刻なら true を返す", () => {
		const dateKey = "2026-07-12";
		const executionHour = resolveExecutionHour(dateKey);
		const now = toUtcDateAtJstHour(dateKey, executionHour);

		expect(toJstDateHour(now)).toEqual({ dateKey, hour: executionHour });
		expect(isUmaOneDrawTopicExecutionHour(now)).toBe(true);
	});

	it("実行対象時刻でなければ false を返す", () => {
		const dateKey = "2026-07-12";
		const executionHour = resolveExecutionHour(dateKey);
		const otherHour = executionHour === 12 ? 13 : 12;
		const now = toUtcDateAtJstHour(dateKey, otherHour);

		expect(toJstDateHour(now)).toEqual({ dateKey, hour: otherHour });
		expect(isUmaOneDrawTopicExecutionHour(now)).toBe(false);
	});
});
