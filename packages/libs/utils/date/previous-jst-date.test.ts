import { afterEach, describe, expect, it, vi } from "vitest";

import { getPreviousJstDateString } from "./previous-jst-date.js";

describe("getPreviousJstDateString", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it.each([
		// JST は UTC+9。UTC 14:59 はまだ JST 同日中
		["2026-09-01T14:59:59.000Z", "2026-08-31"],
		// UTC 15:00 で JST は翌日に変わる
		["2026-09-01T15:00:00.000Z", "2026-09-01"],
		["2026-03-01T00:00:00.000Z", "2026-02-28"],
		["2024-03-01T00:00:00.000Z", "2024-02-29"],
		["2026-01-01T00:00:00.000Z", "2025-12-31"],
	])("%s 時点の前日は %s", (now, expected) => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(now));

		expect(getPreviousJstDateString()).toBe(expected);
	});
});
