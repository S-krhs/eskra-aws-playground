// In scope: kicking off the sync Lambda without waiting for it
// Out of scope: running the sync itself, reading the run record, resolving the config file
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/contracts/media-jobs.js";

/** Which sync Lambda to invoke. */
export interface MediaSyncTarget {
	functionName: string;
	region: string;
}

/**
 * Starts the sync job asynchronously. A sync takes minutes, so nothing waits on the response —
 * progress is read from MediaSyncRun instead. A double start is refused by the sync job itself,
 * which checks its own running record, so nothing guards against it here.
 */
export const startMediaSync = async (
	target: MediaSyncTarget,
): Promise<void> => {
	const client = new LambdaClient({ region: target.region });

	await client.send(
		new InvokeCommand({
			FunctionName: target.functionName,
			InvocationType: "Event",
			Payload: Buffer.from(
				JSON.stringify({ job: mediaJobNames.mediaSync }),
				"utf8",
			),
		}),
	);
};
