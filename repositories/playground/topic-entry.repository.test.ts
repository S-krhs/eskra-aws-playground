import { describe, expect, it } from "vitest";

import { topicEntries } from "./data.js";
import { topicEntryRepository } from "./topic-entry.repository.js";

describe("topicEntryRepository", () => {
	it("定義済みお題候補を一覧で返す", () => {
		expect(topicEntryRepository.findMany()).toEqual(topicEntries);
	});

	it("一覧は防御的コピーとして返す", () => {
		const entries = topicEntryRepository.findMany();
		entries.pop();

		expect(topicEntryRepository.findMany()).toHaveLength(topicEntries.length);
	});
});
