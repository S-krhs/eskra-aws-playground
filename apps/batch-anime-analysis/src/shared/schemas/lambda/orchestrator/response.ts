// In scope: the response type the orchestrator Lambda returns
// Out of scope: validating the launch event, sending to SQS, the job itself

export interface OrchestratorResponse {
	ok: true;
	job: string;
	details?: Record<string, unknown>;
}
