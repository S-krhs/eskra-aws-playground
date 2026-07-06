import { describe, expect, it } from "vitest";

import { getCurrentJstDateString } from "./current-jst-date.js";

describe("getCurrentJstDateString", () => {
	it("JST 基準の現在日付を YYYY-MM-DD 形式で返す", () => {
		const expected = new Date(Date.now() + 9 * 60 * 60 * 1000)
			.toISOString()
			.slice(0, 10);

		expect(getCurrentJstDateString()).toBe(expected);
	});

	it("YYYY-MM-DD 形式である", () => {
		expect(getCurrentJstDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
