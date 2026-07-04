import { describe, expect, it } from "vitest";

import { buildBatchLogRecord, toBatchLogError } from "./batch-logger.js";

describe("buildBatchLogRecord", () => {
	it("段階に対応するメッセージと context を持つレコードを作る", () => {
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

	it("context を渡さない場合は context を持たない", () => {
		expect(buildBatchLogRecord("local-runner", "complete")).toEqual({
			name: "local-runner",
			phase: "complete",
			message: "完了",
		});
	});
});

describe("toBatchLogError", () => {
	it("Error は name / message / stack に整える", () => {
		const error = new Error("boom");

		expect(toBatchLogError(error)).toMatchObject({
			name: "Error",
			message: "boom",
		});
	});

	it("Error 以外は UnknownError として文字列化する", () => {
		expect(toBatchLogError("just-a-string")).toEqual({
			name: "UnknownError",
			message: "just-a-string",
		});
	});
});
