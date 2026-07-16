import { describe, expect, it } from "vitest";

import { functionUrlEventSchema } from "./schema.js";

describe("functionUrlEventSchema", () => {
	it("rawPath と headers と body と isBase64Encoded を受け付ける", () => {
		expect(
			functionUrlEventSchema.parse({
				rawPath: "/discord/interactions",
				headers: { "x-signature-ed25519": "abc" },
				body: '{"type":1}',
				isBase64Encoded: false,
			}),
		).toEqual({
			rawPath: "/discord/interactions",
			headers: { "x-signature-ed25519": "abc" },
			body: '{"type":1}',
			isBase64Encoded: false,
		});
	});

	it("body と isBase64Encoded は省略できる", () => {
		expect(functionUrlEventSchema.parse({ rawPath: "/", headers: {} })).toEqual(
			{ rawPath: "/", headers: {} },
		);
	});

	it("rawPath が欠けたイベントはエラーにする", () => {
		expect(() => {
			return functionUrlEventSchema.parse({ headers: {} });
		}).toThrow();
	});

	it("headers が record でないイベントはエラーにする", () => {
		expect(() => {
			return functionUrlEventSchema.parse({ rawPath: "/", headers: "x" });
		}).toThrow();
	});
});
