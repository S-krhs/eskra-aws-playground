import { describe, expect, it } from "vitest";
import { parseOrchestratorEvent } from "./orchestrator-event.js";

describe("parseOrchestratorEvent", () => {
	it("起動イベントを検証して正規化する", () => {
		expect(parseOrchestratorEvent({ scheduleHour: 9 })).toEqual({
			scheduleHour: 9,
		});
	});

	it("scheduleHour が欠けたイベントはエラーにする", () => {
		expect(() => {
			return parseOrchestratorEvent({});
		}).toThrow("scheduleHour");
	});

	it("scheduleHour が number でないイベントはエラーにする", () => {
		expect(() => {
			return parseOrchestratorEvent({ scheduleHour: "9" });
		}).toThrow("scheduleHour");
	});
});
