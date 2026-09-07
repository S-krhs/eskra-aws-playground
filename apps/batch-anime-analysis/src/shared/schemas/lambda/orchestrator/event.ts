// In scope: the external-input schema and type for the orchestrator Lambda's launch event
// Out of scope: deciding what to run from it, enqueuing on SQS
import { z } from "zod";

/** The launch event the orchestrator Lambda receives. */
export const orchestratorEventSchema = z.object({
	scheduleHour: z.number().int().min(0).max(23),
});

/** One per-schedule request the orchestrator processes. */
export type OrchestratorEvent = z.infer<typeof orchestratorEventSchema>;
