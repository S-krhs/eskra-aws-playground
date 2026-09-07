// In scope: R2 の S3 互換 endpoint へ繋ぐ client の生成と、認証情報の wire 解釈
// Out of scope: 認証情報の取得元の解決、bucket 名の決定、オブジェクト操作
import { S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";

/** R2 への接続に必要な認証情報。 */
export interface R2Credentials {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
}

/** オブジェクト操作へ引き回す R2 の client。 */
export type R2Client = S3Client;

const r2CredentialsSchema = z.object({
	accountId: z.string().min(1),
	accessKeyId: z.string().min(1),
	secretAccessKey: z.string().min(1),
});

/**
 * 未検証の値を R2 の認証情報へ変換する。
 * 鍵が漏れないよう、検証失敗のエラーには不正だった項目名だけを載せる。
 */
export const parseR2Credentials = (value: unknown): R2Credentials => {
	const result = r2CredentialsSchema.safeParse(value);

	if (!result.success) {
		const fields = result.error.issues
			.map((issue) => {
				return issue.path.join(".");
			})
			.join(", ");

		throw new Error(`R2 の認証情報が不正です: ${fields}`);
	}

	return result.data;
};

/** 認証情報からアカウント固有の R2 endpoint へ繋ぐ client を作る。 */
export const createR2Client = (credentials: R2Credentials): R2Client => {
	return new S3Client({
		region: "auto",
		endpoint: `https://${credentials.accountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey,
		},
		// 既定の WHEN_SUPPORTED は R2 が解釈しない checksum header を足すため、必要時だけに絞る
		requestChecksumCalculation: "WHEN_REQUIRED",
		responseChecksumValidation: "WHEN_REQUIRED",
	});
};
