import { describe, expect, it } from "vitest";

import { umaOneDrawTopicJobHandler } from "../jobs/uma-one-draw-topic.js";
import { batchRoutes } from "../shared/routes/batch-routes.js";
import { getJobName, resolveBatchJob } from "./batch-router.js";

describe("batch-router", () => {
	it("イベントの job を許可済み route に正規化する", () => {
		expect(getJobName({ job: " UMA-ONE-DRAW-TOPIC " })).toBe(
			batchRoutes.umaOneDrawTopic,
		);
	});

	it("job が未設定ならエラーにする", () => {
		expect(() => {
			return getJobName({});
		}).toThrow("job が設定されていません");
	});

	it("未対応の job は入力値を含めずにエラーにする", () => {
		const unknownJob = "secret-like-value";

		expect(() => {
			return getJobName({ job: unknownJob });
		}).toThrow("未対応の batch job です");

		try {
			getJobName({ job: unknownJob });
		} catch (error) {
			expect(String(error)).not.toContain(unknownJob);
		}
	});

	it("route に対応する handler を返す", () => {
		expect(resolveBatchJob(batchRoutes.umaOneDrawTopic)).toBe(
			umaOneDrawTopicJobHandler,
		);
	});
});
