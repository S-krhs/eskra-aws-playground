// In scope: types and output logic for a batch job's lifecycle as structured logs
// Out of scope: an individual job's own processing, transport specific to a log-collection backend

export type BatchLogPhase = "start" | "complete" | "failure";

export type BatchLogContext = Record<string, unknown>;

export interface BatchLogError {
	name: string;
	message: string;
	stack?: string;
}

export interface BatchLogRecord {
	name: string;
	phase: BatchLogPhase;
	message: string;
	context?: BatchLogContext;
}

export interface BatchLogger {
	start(context?: BatchLogContext): void;
	complete(context?: BatchLogContext): void;
	failure(error: unknown, context?: BatchLogContext): void;
}

// Human-readable per-phase message, shown in the log output (Japanese, like all log text)
const phaseMessages: Record<BatchLogPhase, string> = {
	start: "開始",
	complete: "完了",
	failure: "失敗",
};

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
