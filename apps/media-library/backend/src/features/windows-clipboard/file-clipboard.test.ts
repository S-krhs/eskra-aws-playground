import { describe, expect, it } from "vitest";
import { toSafeFileName } from "./file-clipboard.js";

describe("toSafeFileName", () => {
	it("keeps an ordinary name as it is", () => {
		expect(toSafeFileName("イラスト.png")).toBe("イラスト.png");
	});

	it("drops the directories a metadata-supplied name carries, in either separator", () => {
		expect(toSafeFileName("../../etc/passwd")).toBe("passwd");
		expect(toSafeFileName("..\\..\\Windows\\system.ini")).toBe("system.ini");
	});

	it("falls back to a name of its own where nothing usable is left", () => {
		expect(toSafeFileName("")).toBe("media");
		expect(toSafeFileName("..")).toBe("media");
	});
});
