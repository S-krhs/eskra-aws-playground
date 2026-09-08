// In scope: taking the SQS event and delegating to the per-dataSource scrape job
// Out of scope: interpreting the SQS message body, the scraping itself, notifications

import type { SqsWorkerResponse } from "@/_shared/schemas/lambda/sqs-worker/response.js";
import { dataSourceJob } from "@/jobs/data-source.js";

export const handler = async (event: unknown): Promise<SqsWorkerResponse> => {
	return dataSourceJob(event);
};
