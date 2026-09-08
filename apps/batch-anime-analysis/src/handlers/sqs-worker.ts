// In scope: taking the SQS event and delegating to the per-dataSource scrape job
// Out of scope: interpreting the SQS message body, the scraping itself, notifications
import { dataSourceJob } from "@/jobs/data-source.js";
import type { SqsWorkerResponse } from "@/shared/schemas/lambda/sqs-worker/response.js";

export const handler = async (event: unknown): Promise<SqsWorkerResponse> => {
	return dataSourceJob(event);
};
