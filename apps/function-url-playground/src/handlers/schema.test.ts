import { describe, expect, it } from "vitest";

import { paths } from "./contracts/paths.js";
import { functionUrlEventSchema } from "./schema.js";

describe("functionUrlEventSchema", () => {
	it("accepts rawPath, headers, body and isBase64Encoded", () => {
		expect(
			functionUrlEventSchema.parse({
				rawPath: paths.yacchoBotInteraction,
				headers: { "x-signature-ed25519": "abc" },
				body: '{"type":1}',
				isBase64Encoded: false,
			}),
		).toEqual({
			rawPath: paths.yacchoBotInteraction,
			headers: { "x-signature-ed25519": "abc" },
			body: '{"type":1}',
			isBase64Encoded: false,
		});
	});

	it("allows body and isBase64Encoded to be omitted", () => {
		expect(functionUrlEventSchema.parse({ rawPath: "/", headers: {} })).toEqual(
			{ rawPath: "/", headers: {} },
		);
	});

	it("errors on an event missing rawPath", () => {
		expect(() => {
			return functionUrlEventSchema.parse({ headers: {} });
		}).toThrow();
	});

	it("errors on an event whose headers is not a record", () => {
		expect(() => {
			return functionUrlEventSchema.parse({ rawPath: "/", headers: "x" });
		}).toThrow();
	});
});
