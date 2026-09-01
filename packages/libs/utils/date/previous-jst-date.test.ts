import { describe, expect, it } from "vitest";

import { getCurrentJstDateString } from "./current-jst-date.js";
import { getPreviousJstDateString } from "./previous-jst-date.js";

describe("getPreviousJstDateString", () => {
	it("JST 基準の現在日付の 1 日前を返す", () => {
		const expected = new Date(
			Date.now() + 9 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000,
		)
			.toISOString()
			.slice(0, 10);

		expect(getPreviousJstDateString()).toBe(expected);
	});

	it("現在日付より前の日付を返す", () => {
		expect(getPreviousJstDateString() < getCurrentJstDateString()).toBe(true);
	});
});
