// In scope: taking the orchestrator Lambda's event and running the enqueue job
// Out of scope: the scraping itself, per-dataSource execution control, notification detail
import { orchestratorJob } from "@/jobs/orchestrator.js";
import type { OrchestratorResponse } from "@/shared/schemas/lambda/orchestrator/response.js";

export const handler = async (
	event: unknown = {},
): Promise<OrchestratorResponse> => {
	return orchestratorJob(event);
};
