import { describe, expect, it } from "vitest";
import { parseR2Credentials } from "./r2-client.js";

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
