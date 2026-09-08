// In scope: asking the sync Lambda to start, and resolving which function that is
// Out of scope: running the sync, waiting for it, reading the run record
import { LambdaInvoker } from "@eskra-aws-playground/integration-lambda/lambda-invoker.js";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/media/jobs.js";
import type { SyncStartResponse } from "@eskra-aws-playground/shared-domains/media/library-api.js";
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

/**
 * Starts the sync without waiting for it — a sync takes minutes, so progress is read from the run
 * record instead. A second start is refused by the sync job itself, which takes the one run slot the
 * DB allows, so nothing guards against it here.
 */
export const startSyncOperation = async (): Promise<
	OperationResult<SyncStartResponse>
> => {
	const functionName = process.env.MEDIA_SYNC_FUNCTION_NAME;

	if (!functionName) {
		throw new Error("MEDIA_SYNC_FUNCTION_NAME が設定されていません。");
	}

	await new LambdaInvoker(functionName).invokeEvent({
		job: mediaJobNames.mediaSync,
	});

	return { kind: "OK", data: { started: true } };
};
