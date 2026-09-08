// In scope: invoking a Lambda function through the AWS SDK
// Out of scope: resolving the function name or region, building the payload, what the invoked function does
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

// Shared across instances: a long-lived caller invoking per request would otherwise build a new
// connection pool every time. The SDK reads the region from the environment, as it does elsewhere here
let client: LambdaClient | undefined;

export class LambdaInvoker {
	public constructor(private readonly functionName: string) {}

	/**
	 * Returns once Lambda has accepted the request, without waiting for the function.
	 * Nothing comes back — not even a failure raised inside the function — so the caller needs its own
	 * way to observe the outcome.
	 */
	public async invokeEvent(payload: unknown): Promise<void> {
		client ??= new LambdaClient({});

		await client.send(
			new InvokeCommand({
				FunctionName: this.functionName,
				InvocationType: "Event",
				Payload: Buffer.from(JSON.stringify(payload), "utf8"),
			}),
		);
	}
}
