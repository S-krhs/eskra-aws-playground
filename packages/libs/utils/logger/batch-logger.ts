// In scope: batch 処理のライフサイクルを構造化ログとして出力する型と出力ロジックを提供する
// Out of scope: 個別ジョブの処理内容や、ログ収集基盤固有の転送処理を持つ

/** batch 処理ライフサイクルの段階。 */
export type BatchLogPhase = "start" | "complete" | "failure";

/** 構造化ログに付随させる任意のコンテキスト。 */
export type BatchLogContext = Record<string, unknown>;

/** 構造化ログに載せられる形へ整えた error 情報。 */
export interface BatchLogError {
	name: string;
	message: string;
	stack?: string;
}

/** 1 行の構造化ログとして出力するレコード。 */
export interface BatchLogRecord {
	/** ログの発生元を識別する batch 名。 */
	name: string;
	/** batch 処理ライフサイクルの段階。 */
	phase: BatchLogPhase;
	/** 段階を表す人間可読メッセージ。 */
	message: string;
	/** 付随する構造化コンテキスト。 */
	context?: BatchLogContext;
}

/** batch 名を固定した構造化ログ出力を提供する logger。 */
export interface BatchLogger {
	/** batch 処理の開始を記録する。 */
	start(context?: BatchLogContext): void;
	/** batch 処理の正常完了を記録する。 */
	complete(context?: BatchLogContext): void;
	/** batch 処理の失敗を error 情報付きで記録する。 */
	failure(error: unknown, context?: BatchLogContext): void;
}

/** 段階ごとの人間可読メッセージ。 */
const phaseMessages: Record<BatchLogPhase, string> = {
	start: "開始",
	complete: "完了",
	failure: "失敗",
};

/** 任意の error を構造化ログへ載せられる形に整える。 */
export const toBatchLogError = (error: unknown): BatchLogError => {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}

	return {
		name: "UnknownError",
		message: String(error),
	};
};

/** 構造化ログレコードを組み立てる。 */
export const buildBatchLogRecord = (
	name: string,
	phase: BatchLogPhase,
	context?: BatchLogContext,
): BatchLogRecord => {
	return {
		name,
		phase,
		message: phaseMessages[phase],
		...(context ? { context } : {}),
	};
};

/** batch 名を固定した構造化ログ logger を作る。 */
export const createBatchLogger = (name: string): BatchLogger => {
	return {
		start: (context) => {
			console.log(buildBatchLogRecord(name, "start", context));
		},
		complete: (context) => {
			console.log(buildBatchLogRecord(name, "complete", context));
		},
		failure: (error, context) => {
			console.error(
				buildBatchLogRecord(name, "failure", {
					...context,
					error: toBatchLogError(error),
				}),
			);
		},
	};
};
