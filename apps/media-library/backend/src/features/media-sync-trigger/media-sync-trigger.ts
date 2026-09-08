// In scope: kicking off the sync Lambda without waiting for it, and resolving which one from the environment
// Out of scope: running the sync itself, reading the run record, reading the config file
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { mediaJobNames } from "@eskra-aws-playground/shared-domains/contracts/media-jobs.js";

let client: LambdaClient | undefined;

const getFunctionName = (): string => {
	const functionName = process.env.MEDIA_SYNC_FUNCTION_NAME;

	if (!functionName) {
		throw new Error("MEDIA_SYNC_FUNCTION_NAME が設定されていません。");
	}

	return functionName;
};

/**
 * Starts the sync job asynchronously. A sync takes minutes, so nothing waits on the response —
 * progress is read from MediaSyncRun instead. A double start is refused by the sync job itself,
 * which takes the one run slot the DB allows, so nothing guards against it here.
 */
export const startMediaSync = async (): Promise<void> => {
	client ??= new LambdaClient({ region: process.env.AWS_REGION });

	await client.send(
		new InvokeCommand({
			FunctionName: getFunctionName(),
			InvocationType: "Event",
			Payload: Buffer.from(
				JSON.stringify({ job: mediaJobNames.mediaSync }),
				"utf8",
			),
		}),
	);
};
