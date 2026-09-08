import { describe, expect, it } from "vitest";
import { parseServiceAccountKey } from "./service-account-credentials.js";

const validKey = JSON.stringify({
	type: "service_account",
	project_id: "example-project",
	client_email: "exporter@example-project.iam.gserviceaccount.com",
	private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
});

describe("parseServiceAccountKey", () => {
	it("extracts credentials from the key JSON", () => {
		expect(parseServiceAccountKey(validKey)).toEqual({
			projectId: "example-project",
			clientEmail: "exporter@example-project.iam.gserviceaccount.com",
			privateKey:
				"-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
		});
	});

	it("errors on a key that isn't valid JSON", () => {
		expect(() => {
			return parseServiceAccountKey("not-json");
		}).toThrow("JSON として解釈できません");
	});

	it("errors on a key missing a required field", () => {
		expect(() => {
			return parseServiceAccountKey(JSON.stringify({ project_id: "p" }));
		}).toThrow("project_id・client_email・private_key");
	});

	it("never puts the key's contents in the error message", () => {
		const secretValue = "super-secret-private-key";

		expect(() => {
			return parseServiceAccountKey(
				JSON.stringify({ private_key: secretValue }),
			);
		}).toThrow(expect.not.stringContaining(secretValue));
	});
});
