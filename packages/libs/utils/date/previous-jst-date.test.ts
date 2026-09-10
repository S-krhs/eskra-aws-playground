import { afterEach, describe, expect, it, vi } from "vitest";

import { getPreviousJstDateString } from "./previous-jst-date.js";

describe("getPreviousJstDateString", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it.each([
		// JST is UTC+9 — UTC 14:59 is still the same JST day
		["2026-09-01T14:59:59.000Z", "2026-08-31"],
		// At UTC 15:00, JST rolls over to the next day
		["2026-09-01T15:00:00.000Z", "2026-09-01"],
		["2026-03-01T00:00:00.000Z", "2026-02-28"],
		["2024-03-01T00:00:00.000Z", "2024-02-29"],
		["2026-01-01T00:00:00.000Z", "2025-12-31"],
	])("at %s, yesterday is %s", (now, expected) => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(now));

		expect(getPreviousJstDateString()).toBe(expected);
	});
});
