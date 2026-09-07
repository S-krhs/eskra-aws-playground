import { describe, expect, it } from "vitest";
import { parseR2Credentials, parseR2CredentialsJson } from "./r2-client.js";

const validCredentials = {
	accountId: "acc-1",
	accessKeyId: "key-1",
	secretAccessKey: "secret-1",
};

describe("parseR2Credentials", () => {
	it("揃った認証情報をそのまま返す", () => {
		expect(parseR2Credentials(validCredentials)).toEqual(validCredentials);
	});

	it("項目が欠けていれば項目名を示して失敗させる", () => {
		expect(() => {
			return parseR2Credentials({
				accountId: "acc-1",
				accessKeyId: "key-1",
			});
		}).toThrow(/secretAccessKey/);
	});

	it("空文字を受け付けない", () => {
		expect(() => {
			return parseR2Credentials({ ...validCredentials, accessKeyId: "" });
		}).toThrow(/accessKeyId/);
	});

	// 鍵そのものがログやエラー通知へ流れないことを担保する
	it("エラーメッセージに鍵の値を含めない", () => {
		expect(() => {
			return parseR2Credentials({ ...validCredentials, accountId: "" });
		}).not.toThrow(/secret-1/);
	});
});

describe("parseR2CredentialsJson", () => {
	it("JSON 文字列から認証情報を取り出す", () => {
		expect(parseR2CredentialsJson(JSON.stringify(validCredentials))).toEqual(
			validCredentials,
		);
	});

	// JSON.parse の SyntaxError は入力の先頭 10 文字を message に含める。
	// secret をそのまま貼り間違えた場合に、その中身がログへ出てしまう
	it("構文が壊れていても入力の中身をエラーへ載せない", () => {
		expect(() => {
			return parseR2CredentialsJson("SUPER-SECRET-VALUE-12345");
		}).toThrow("R2 の認証情報を JSON として解釈できません。");
	});

	it("JSON として読めても項目が欠けていれば項目名を示す", () => {
		expect(() => {
			return parseR2CredentialsJson(JSON.stringify({ accountId: "acc-1" }));
		}).toThrow(/accessKeyId, secretAccessKey/);
	});
});
