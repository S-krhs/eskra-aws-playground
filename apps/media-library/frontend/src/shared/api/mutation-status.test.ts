import { describe, expect, it } from "vitest";
import { toMutationStatus } from "./mutation-status.js";

const mutation = (state: {
	isPending?: boolean;
	isError?: boolean;
	isSuccess?: boolean;
	data?: unknown;
	error?: unknown;
}) => {
	return {
		isPending: false,
		isError: false,
		isSuccess: false,
		data: undefined,
		error: null,
		...state,
	};
};

describe("toMutationStatus", () => {
	it("has nothing to report before anything has been sent", () => {
		expect(toMutationStatus(mutation({}))).toEqual({ kind: "idle" });
	});

	it("reports a request still in flight", () => {
		expect(toMutationStatus(mutation({ isPending: true }))).toEqual({
			kind: "pending",
		});
	});

	it("reports the success the API answered with", () => {
		expect(
			toMutationStatus(
				mutation({ isSuccess: true, data: { status: 204, data: undefined } }),
			),
		).toEqual({ kind: "done" });
	});

	it("carries the backend's wording for a failure it resolved", () => {
		expect(
			toMutationStatus(
				mutation({
					isSuccess: true,
					data: { status: 404, data: { message: "そのメディアはありません" } },
				}),
			),
		).toEqual({ kind: "failed", message: "そのメディアはありません" });
	});

	it("falls back to the status for a failure carrying no body of the API's", () => {
		expect(
			toMutationStatus(
				mutation({ isSuccess: true, data: { status: 502, data: undefined } }),
			),
		).toEqual({ kind: "failed", message: "HTTP 502" });
	});

	it("reads a request that never reached the server, which rejects instead", () => {
		expect(
			toMutationStatus(
				mutation({ isError: true, error: new Error("Failed to fetch") }),
			),
		).toEqual({ kind: "failed", message: "Failed to fetch" });
	});

	it("reads a rejection that is not an Error as it stands", () => {
		expect(
			toMutationStatus(mutation({ isError: true, error: "切断されました" })),
		).toEqual({ kind: "failed", message: "切断されました" });
	});
});
