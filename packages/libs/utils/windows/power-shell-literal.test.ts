import { describe, expect, it } from "vitest";
import { toPowerShellLiteral } from "./power-shell-literal.js";

describe("toPowerShellLiteral", () => {
	it("wraps the value in the quotes PowerShell reads literally", () => {
		expect(toPowerShellLiteral("C:\\Users\\foo\\a.png")).toBe(
			"'C:\\Users\\foo\\a.png'",
		);
	});

	it("doubles a quote of its own, so the literal can't be closed early", () => {
		expect(toPowerShellLiteral("it's here'; Remove-Item C:\\")).toBe(
			"'it''s here''; Remove-Item C:\\'",
		);
	});
});
