import { describe, expect, it } from "vitest";
import { sqsWorkerEventSchema } from "./event.js";

describe("sqsWorkerEventSchema", () => {
	it("validates the launch event and normalizes it down to the fields used", () => {
		const parsed = sqsWorkerEventSchema.parse({
			Records: [
				{
					messageId: "message-1",
					body: '{"dataSourceId":"source-a"}',
					// The unused fields AWS attaches are dropped.
					receiptHandle: "receipt-1",
					eventSource: "aws:sqs",
				},
			],
		});

		expect(parsed).toEqual({
			Records: [
				{
					messageId: "message-1",
					body: '{"dataSourceId":"source-a"}',
				},
			],
		});
	});

	it("errors on an event missing Records", () => {
		expect(() => {
			return sqsWorkerEventSchema.parse({});
		}).toThrow("Records");
	});

	it("errors on a record whose messageId is empty or whose body is not a string", () => {
		expect(() => {
			return sqsWorkerEventSchema.parse({
				Records: [{ messageId: "", body: "{}" }],
			});
		}).toThrow("messageId");

		expect(() => {
			return sqsWorkerEventSchema.parse({
				Records: [
					{ messageId: "message-1", body: { dataSourceId: "source-a" } },
				],
			});
		}).toThrow("body");
	});
});
