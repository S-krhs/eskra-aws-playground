import { describe, expect, it } from "vitest";
import { assertDeletableSize } from "./delete-guard.js";

describe("assertDeletableSize", () => {
	it("passes a handful of deletions", () => {
		expect(() => {
			return assertDeletableSize(10, 20);
		}).not.toThrow();
	});

	it("passes a deletion that is small against the whole", () => {
		expect(() => {
			return assertDeletableSize(100, 10_000);
		}).not.toThrow();
	});

	// Covers a listing gone nearly empty from a narrowed token or a wrong bucket name.
	// Deleting a row takes its tag links with it, and tags added by hand can't be restored.
	it("stops a deletion covering too large a fraction", () => {
		expect(() => {
			return assertDeletableSize(5_000, 10_000);
		}).toThrow(/MEDIA_BUCKET/);
	});

	it("stops a deletion that would wipe every registered row", () => {
		expect(() => {
			return assertDeletableSize(10_000, 10_000);
		}).toThrow();
	});

	// A fraction says nothing while few rows are registered, so anything up to the floor passes
	it("passes anything up to the floor regardless of the fraction", () => {
		expect(() => {
			return assertDeletableSize(50, 50);
		}).not.toThrow();
	});
});
