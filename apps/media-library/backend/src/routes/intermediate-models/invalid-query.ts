// In scope: 検証に失敗した query を、値を含まないエラーメッセージへ変換する
// Out of scope: 検証そのもの、HTTP status の決定、route の実装
import type { ZodError } from "zod";

/**
 * 検証に失敗した項目名だけを並べたメッセージを返す。
 * 渡された値はそのまま応答へ出さない(そのまま画面やログへ流れるため)。
 */
export const toInvalidQueryMessage = (error: ZodError): string => {
	const fields = error.issues
		.map((issue) => {
			return issue.path.join(".") || "(全体)";
		})
		.join(", ");

	return `query の項目が不正です: ${fields}`;
};
