import { describe, expect, it } from "vitest";
import { parseServiceAccountKey } from "./service-account-credentials.js";

const validKey = JSON.stringify({
	type: "service_account",
	project_id: "example-project",
	client_email: "exporter@example-project.iam.gserviceaccount.com",
	private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
});

describe("parseServiceAccountKey", () => {
	it("鍵 JSON から認証情報を取り出す", () => {
		expect(parseServiceAccountKey(validKey)).toEqual({
			projectId: "example-project",
			clientEmail: "exporter@example-project.iam.gserviceaccount.com",
			privateKey:
				"-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
		});
	});

	it("JSON として解釈できない鍵はエラーにする", () => {
		expect(() => {
			return parseServiceAccountKey("not-json");
		}).toThrow("JSON として解釈できません");
	});

	it("必須項目が欠けた鍵はエラーにする", () => {
		expect(() => {
			return parseServiceAccountKey(JSON.stringify({ project_id: "p" }));
		}).toThrow("project_id・client_email・private_key");
	});

	it("鍵の中身をエラーメッセージへ含めない", () => {
		const secretValue = "super-secret-private-key";

		expect(() => {
			return parseServiceAccountKey(
				JSON.stringify({ private_key: secretValue }),
			);
		}).toThrow(expect.not.stringContaining(secretValue));
	});
});
