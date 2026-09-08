import { describe, expect, it } from "vitest";

import { getCurrentJstDateString } from "./current-jst-date.js";

describe("getCurrentJstDateString", () => {
	it("returns today's date in JST as YYYY-MM-DD", () => {
		const expected = new Date(Date.now() + 9 * 60 * 60 * 1000)
			.toISOString()
			.slice(0, 10);

		expect(getCurrentJstDateString()).toBe(expected);
	});

	it("is in YYYY-MM-DD format", () => {
		expect(getCurrentJstDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
