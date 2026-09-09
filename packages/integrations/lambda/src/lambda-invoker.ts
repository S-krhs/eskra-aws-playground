// In scope: invoking a Lambda function through the AWS SDK
// Out of scope: resolving the function name or region, building the payload, what the invoked function does
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

export class LambdaInvokeError extends Error {
	constructor(message: string, cause: unknown = null) {
		super(message, { cause });
		this.name = "LambdaInvokeError";
	}
}

export class LambdaInvoker {
	private readonly client = new LambdaClient({});

	public constructor(private readonly functionName: string) {}

	/**
	 * Returns once Lambda has accepted the request, without waiting for the function.
	 * Nothing comes back — not even a failure raised inside the function — so the caller needs its own
	 * way to observe the outcome.
	 */
	public async invokeEvent(payload: unknown): Promise<void> {
		try {
			await this.client.send(
				new InvokeCommand({
					FunctionName: this.functionName,
					InvocationType: "Event",
					Payload: Buffer.from(JSON.stringify(payload), "utf8"),
				}),
			);
		} catch (error) {
			throw new LambdaInvokeError(
				`Lambda 関数の非同期呼び出しに失敗しました: ${this.functionName}`,
				error,
			);
		}
	}
}
