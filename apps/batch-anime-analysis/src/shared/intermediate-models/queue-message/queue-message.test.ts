import { describe, expect, it } from "vitest";
import { parseQueueMessage } from "./queue-message.js";

describe("parseQueueMessage", () => {
	it("SQS message body を検証して正規化する", () => {
		expect(
			parseQueueMessage(JSON.stringify({ dataSourceId: "source-a" })),
		).toEqual({ dataSourceId: "source-a" });
	});

	it("dataSourceId が欠けた body はエラーにする", () => {
		expect(() => {
			return parseQueueMessage(JSON.stringify({}));
		}).toThrow("dataSourceId");
	});
});
