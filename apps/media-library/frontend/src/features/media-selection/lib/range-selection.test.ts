import { describe, expect, it } from "vitest";
import { pickRange } from "./range-selection.js";

const ORDER = ["a", "b", "c", "d", "e"];

describe("pickRange", () => {
	it("includes both ends", () => {
		expect(pickRange(ORDER, "b", "d")).toEqual(["b", "c", "d"]);
	});

	it("keeps the order's own direction when the ends come reversed", () => {
		expect(pickRange(ORDER, "d", "b")).toEqual(["b", "c", "d"]);
	});

	it("is the one id when both ends are the same", () => {
		expect(pickRange(ORDER, "c", "c")).toEqual(["c"]);
	});

	it("has no range once an end has left the order", () => {
		expect(pickRange(ORDER, "gone", "c")).toBeUndefined();
		expect(pickRange(ORDER, "c", "gone")).toBeUndefined();
	});
});
