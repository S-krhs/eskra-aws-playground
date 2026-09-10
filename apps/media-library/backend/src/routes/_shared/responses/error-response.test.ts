import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toInvalidRequestResponse } from "./error-response.js";

/** Checks the value really was rejected and pulls the error out of the result. */
const rejectionOf = (schema: z.ZodType, value: unknown): z.ZodError => {
	const result = schema.safeParse(value);

	if (result.success) {
		throw new Error("検証が失敗するはずの値が通ってしまった");
	}

	return result.error;
};

describe("toInvalidRequestResponse", () => {
	it("names the fields that failed and none of the values that were passed", () => {
		const error = rejectionOf(
			z.object({ limit: z.number().max(500), cursorId: z.uuid() }),
			{ limit: 9999, cursorId: "not-a-uuid" },
		);

		expect(toInvalidRequestResponse(error)).toEqual({
			message: "リクエストの項目が不正です: limit, cursorId",
		});
	});

	it("says the whole body failed when no field can be named", () => {
		const error = rejectionOf(z.object({ id: z.string() }), "not-an-object");

		expect(toInvalidRequestResponse(error)).toEqual({
			message: "リクエストの項目が不正です: (全体)",
		});
	});
});
