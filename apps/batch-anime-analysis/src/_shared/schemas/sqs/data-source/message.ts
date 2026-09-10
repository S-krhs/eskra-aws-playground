// In scope: the external-input schema and type for the per-dataSource scrape request the worker receives
// Out of scope: SQS send/receive, deciding what to run, normalizing the launch event
import { z } from "zod";

/** The per-dataSource scrape request the worker processes. */
export const dataSourceMessageSchema = z.object({
	dataSourceId: z.string().min(1),
});

export type DataSourceMessage = z.infer<typeof dataSourceMessageSchema>;
