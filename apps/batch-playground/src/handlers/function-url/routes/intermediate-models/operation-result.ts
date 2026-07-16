// In scope: route 内で operation が返す成功・失敗の中間結果型
// Out of scope: Discord protocol payload、HTTP response、業務ルール

/** 要求された操作を解釈・実行できない失敗。 */
export type Unsupported<T> = { kind: "UNSUPPORTED"; data: T };

/** 実行者に操作が許可されていない失敗。 */
export type Forbidden<T> = { kind: "FORBIDDEN"; data: T };

/** operation の成功・失敗を表す中間結果。いずれも 200 で返す payload を data に持つ。 */
export type OperationResult<T, E extends { kind: string } = never> =
	| { kind: "OK"; data: T }
	| E;
