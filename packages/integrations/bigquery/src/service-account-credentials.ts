// In scope: GCP サービスアカウント鍵 JSON を BigQuery クライアント用の認証情報へ検証・変換する
// Out of scope: 鍵の取得元の解決、BigQuery API の呼び出しを行う
import { z } from "zod";

/** BigQuery クライアントへ渡す GCP サービスアカウント認証情報。 */
export interface BigQueryServiceAccountCredentials {
	projectId: string;
	clientEmail: string;
	privateKey: string;
}

const serviceAccountKeySchema = z.object({
	project_id: z.string().min(1),
	client_email: z.string().min(1),
	private_key: z.string().min(1),
});

/**
 * GCP サービスアカウント鍵 JSON を認証情報へ変換する。
 * 鍵の中身が漏れないよう、失敗時は検証結果の詳細をエラーメッセージへ含めない。
 */
export const parseServiceAccountKey = (
	serviceAccountKey: string,
): BigQueryServiceAccountCredentials => {
	let parsedKey: unknown;
	try {
		parsedKey = JSON.parse(serviceAccountKey);
	} catch {
		throw new Error("GCP サービスアカウント鍵を JSON として解釈できません。");
	}

	const result = serviceAccountKeySchema.safeParse(parsedKey);
	if (!result.success) {
		throw new Error(
			"GCP サービスアカウント鍵に project_id・client_email・private_key が揃っていません。",
		);
	}

	return {
		projectId: result.data.project_id,
		clientEmail: result.data.client_email,
		privateKey: result.data.private_key,
	};
};
