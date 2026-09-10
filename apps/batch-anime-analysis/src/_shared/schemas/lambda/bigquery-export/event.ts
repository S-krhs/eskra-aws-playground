// In scope: the external-input schema and type for the BigQuery export Lambda's launch event
// Out of scope: resolving the default export dates, reading metrics, writing to BigQuery
import { z } from "zod";

/** The launch event this Lambda receives; the dates are inclusive, and omitting them lets the job resolve the previous day. */
export const bigQueryExportEventSchema = z.object({
	startDate: z.iso.date().optional(),
	endDate: z.iso.date().optional(),
});

export type BigQueryExportEvent = z.infer<typeof bigQueryExportEventSchema>;
