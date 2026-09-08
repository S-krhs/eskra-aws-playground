import { describe, expect, it } from "vitest";
import { parseR2Credentials } from "./r2.js";

const validCredentials = {
	accountId: "acc-1",
	accessKeyId: "key-1",
	secretAccessKey: "secret-1",
};

describe("parseR2Credentials", () => {
	it("extracts credentials from a JSON string", () => {
		expect(parseR2Credentials(JSON.stringify(validCredentials))).toEqual(
			validCredentials,
		);
	});

	it("fails, naming the field, when one is missing", () => {
		expect(() => {
			return parseR2Credentials(JSON.stringify({ accountId: "acc-1" }));
		}).toThrow(/accessKeyId, secretAccessKey/);
	});

	it("rejects an empty string", () => {
		expect(() => {
			return parseR2Credentials(
				JSON.stringify({ ...validCredentials, accessKeyId: "" }),
			);
		}).toThrow(/accessKeyId/);
	});

	// Guards against the key itself leaking into a log or error notification
	it("never puts a key value in the error message", () => {
		expect(() => {
			return parseR2Credentials(
				JSON.stringify({ ...validCredentials, accountId: "" }),
			);
		}).not.toThrow(/secret-1/);
	});

	// JSON.parse's SyntaxError embeds the input's first 10 characters in its message —
	// pasting the raw secret in by mistake would leak its contents into a log
	it("never puts the input's contents in the error even on a syntax failure", () => {
		expect(() => {
			return parseR2Credentials("SUPER-SECRET-VALUE-12345");
		}).toThrow("R2 の認証情報を JSON として解釈できません。");
	});
});
