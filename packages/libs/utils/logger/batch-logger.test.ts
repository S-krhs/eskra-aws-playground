import { describe, expect, it } from "vitest";

import { buildBatchLogRecord, toBatchLogError } from "./batch-logger.js";

describe("buildBatchLogRecord", () => {
	it("builds a record with the phase's message and the given context", () => {
		expect(
			buildBatchLogRecord("anime-scraping-orchestrator", "start", {
				requestedCount: 3,
			}),
		).toEqual({
			name: "anime-scraping-orchestrator",
			phase: "start",
			message: "開始",
			context: {
				requestedCount: 3,
			},
		});
	});

	it("omits context when none is passed", () => {
		expect(buildBatchLogRecord("local-runner", "complete")).toEqual({
			name: "local-runner",
			phase: "complete",
			message: "完了",
		});
	});
});

describe("toBatchLogError", () => {
	it("shapes an Error into name/message/stack", () => {
		const error = new Error("boom");

		expect(toBatchLogError(error)).toMatchObject({
			name: "Error",
			message: "boom",
		});
	});

	it("stringifies a non-Error as UnknownError", () => {
		expect(toBatchLogError("just-a-string")).toEqual({
			name: "UnknownError",
			message: "just-a-string",
		});
	});
});
