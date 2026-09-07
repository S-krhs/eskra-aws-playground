// In scope: the runtime settings the orchestrator job uses, and resolving them from the SST links
// Out of scope: interpreting the Lambda event, calling an external service, deciding which job runs
import { requireLinkedUrl } from "./require-linked-resource.js";

/** The runtime settings the orchestrator job uses. */
export interface OrchestratorSettings {
	queueUrl: string;
}

/** Resolves the runtime settings the orchestrator job uses. */
export const getOrchestratorSettings = (): OrchestratorSettings => {
	return {
		queueUrl: requireLinkedUrl("AnimeAnalysisQueue"),
	};
};
