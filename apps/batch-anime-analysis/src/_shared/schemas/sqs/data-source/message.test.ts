import { describe, expect, it } from "vitest";
import { dataSourceMessageSchema } from "./message.js";

describe("dataSourceMessageSchema", () => {
	it("validates and normalizes a worker message", () => {
		expect(dataSourceMessageSchema.parse({ dataSourceId: "source-a" })).toEqual(
			{
				dataSourceId: "source-a",
			},
		);
	});

	it("errors on a message missing dataSourceId", () => {
		expect(() => {
			return dataSourceMessageSchema.parse({});
		}).toThrow("dataSourceId");
	});

	it("errors on a message whose dataSourceId is empty or not a string", () => {
		expect(() => {
			return dataSourceMessageSchema.parse({ dataSourceId: "" });
		}).toThrow("dataSourceId");

		expect(() => {
			return dataSourceMessageSchema.parse({ dataSourceId: 1 });
		}).toThrow("dataSourceId");
	});
});
