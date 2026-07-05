import { describe, expect, it } from "vitest";
import { batchEventSchema } from "./event.js";

describe("batchEventSchema", () => {
	it("起動イベントの job を trim と小文字化で正規化する", () => {
		expect(batchEventSchema.parse({ job: " UMA-ONE-DRAW-TOPIC " })).toEqual({
			job: "uma-one-draw-topic",
		});
	});

	it("job が欠けたイベントはエラーにする", () => {
		expect(() => {
			return batchEventSchema.parse({});
		}).toThrow();
	});

	it("job が string でないイベントはエラーにする", () => {
		expect(() => {
			return batchEventSchema.parse({ job: 1 });
		}).toThrow();
	});

	it("job が空白のみのイベントはエラーにする", () => {
		expect(() => {
			return batchEventSchema.parse({ job: "   " });
		}).toThrow();
	});
});
