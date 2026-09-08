import { describe, expect, it } from "vitest";
import { parseR2Credentials, parseR2CredentialsJson } from "./r2-client.js";

const validCredentials = {
	accountId: "acc-1",
	accessKeyId: "key-1",
	secretAccessKey: "secret-1",
};

describe("parseR2Credentials", () => {
	it("returns complete credentials as-is", () => {
		expect(parseR2Credentials(validCredentials)).toEqual(validCredentials);
	});

	it("fails, naming the field, when one is missing", () => {
		expect(() => {
			return parseR2Credentials({
				accountId: "acc-1",
				accessKeyId: "key-1",
			});
		}).toThrow(/secretAccessKey/);
	});

	it("rejects an empty string", () => {
		expect(() => {
			return parseR2Credentials({ ...validCredentials, accessKeyId: "" });
		}).toThrow(/accessKeyId/);
	});

	// Guards against the key itself leaking into a log or error notification
	it("never puts a key value in the error message", () => {
		expect(() => {
			return parseR2Credentials({ ...validCredentials, accountId: "" });
		}).not.toThrow(/secret-1/);
	});
});

describe("parseR2CredentialsJson", () => {
	it("extracts credentials from a JSON string", () => {
		expect(parseR2CredentialsJson(JSON.stringify(validCredentials))).toEqual(
			validCredentials,
		);
	});

	// JSON.parse's SyntaxError embeds the input's first 10 characters in its message —
	// pasting the raw secret in by mistake would leak its contents into a log
	it("never puts the input's contents in the error even on a syntax failure", () => {
		expect(() => {
			return parseR2CredentialsJson("SUPER-SECRET-VALUE-12345");
		}).toThrow("R2 の認証情報を JSON として解釈できません。");
	});

	it("names the field when JSON parses but a field is missing", () => {
		expect(() => {
			return parseR2CredentialsJson(JSON.stringify({ accountId: "acc-1" }));
		}).toThrow(/accessKeyId, secretAccessKey/);
	});
});
