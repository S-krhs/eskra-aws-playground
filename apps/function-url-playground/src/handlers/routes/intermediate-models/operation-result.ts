// In scope: route 内で operation が返す中間結果型
// Out of scope: Discord protocol payload、HTTP response、業務ルール

/** operation の結果。非 OK の結果は route で明示的に処理する。 */
export type OperationResult<T, E extends { kind: string } = never> =
	| { kind: "OK"; data: T }
	| E;
