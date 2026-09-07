// In scope: the runtime settings the orchestrator job uses, and resolving them from the SST links
// Out of scope: interpreting the Lambda event, calling an external service, deciding which job runs
import { requireLinkedUrl } from "./require-linked-resource.js";

export interface OrchestratorSettings {
	queueUrl: string;
}

export const getOrchestratorSettings = (): OrchestratorSettings => {
	return {
		queueUrl: requireLinkedUrl("AnimeAnalysisQueue"),
	};
};
