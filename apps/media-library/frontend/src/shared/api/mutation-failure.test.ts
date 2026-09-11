import { describe, expect, it } from "vitest";
import { toMutationFailure } from "./mutation-failure.js";

describe("toMutationFailure", () => {
	it("reads the message out of a failure the client resolved", () => {
		expect(
			toMutationFailure(
				{
					data: { status: 404, data: { message: "そのメディアはありません" } },
					error: null,
				},
				204,
			),
		).toBe("そのメディアはありません");
	});

	it("reads a request that never reached the server, which rejects instead", () => {
		expect(
			toMutationFailure(
				{ data: undefined, error: new Error("Failed to fetch") },
				204,
			),
		).toBe("Failed to fetch");
	});

	it("has nothing to report on the success the caller named", () => {
		expect(
			toMutationFailure(
				{ data: { status: 204, data: undefined }, error: null },
				204,
			),
		).toBeUndefined();
	});

	it("has nothing to report before anything has been sent", () => {
		expect(
			toMutationFailure({ data: undefined, error: null }, 200),
		).toBeUndefined();
	});

	it("falls back to the rejection for a mutation that resolves with nothing", () => {
		expect(
			toMutationFailure(
				{ data: undefined, error: new Error("画像を変換できませんでした") },
				200,
			),
		).toBe("画像を変換できませんでした");
	});
});
