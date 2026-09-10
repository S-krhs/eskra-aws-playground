import { describe, expect, it } from "vitest";

import { getJstDateTimeParts } from "./jst-date-time-parts.js";

describe("getJstDateTimeParts", () => {
	it("shifts the instant onto the JST wall clock", () => {
		expect(getJstDateTimeParts(new Date("2026-09-07T04:30:45.123Z"))).toEqual({
			year: "2026",
			month: "09",
			day: "07",
			hour: "13",
			minute: "30",
			second: "45",
			millisecond: "123",
		});
	});

	// UTC 15:00 is the next JST day, so the date has to roll forward with the clock
	it("rolls the date forward when the conversion crosses midnight", () => {
		expect(getJstDateTimeParts(new Date("2026-09-07T15:00:00.000Z"))).toEqual({
			year: "2026",
			month: "09",
			day: "08",
			hour: "00",
			minute: "00",
			second: "00",
			millisecond: "000",
		});
	});

	it("zero-pads every part to a fixed width", () => {
		expect(getJstDateTimeParts(new Date("2026-01-02T00:00:00.004Z"))).toEqual({
			year: "2026",
			month: "01",
			day: "02",
			hour: "09",
			minute: "00",
			second: "00",
			millisecond: "004",
		});
	});
});
