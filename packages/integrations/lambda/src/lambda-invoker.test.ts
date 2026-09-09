import { afterEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => {
	return vi.fn();
});

vi.mock("@aws-sdk/client-lambda", () => {
	return {
		LambdaClient: class {
			send = send;
		},
		InvokeCommand: class {
			public constructor(public readonly input: unknown) {}
		},
	};
});

import { LambdaInvokeError, LambdaInvoker } from "./lambda-invoker.js";

describe("LambdaInvoker", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("invokes the named function without waiting for its result", async () => {
		send.mockResolvedValue({});

		await new LambdaInvoker("media-sync").invokeEvent({ job: "media-sync" });

		expect(send).toHaveBeenCalledTimes(1);
		expect(send.mock.calls[0]?.[0].input).toEqual({
			FunctionName: "media-sync",
			InvocationType: "Event",
			Payload: Buffer.from(JSON.stringify({ job: "media-sync" }), "utf8"),
		});
	});

	it("turns a failure to hand the request over into its own error", async () => {
		const sdkError = new Error("AccessDeniedException");
		send.mockRejectedValue(sdkError);

		const error = await new LambdaInvoker("media-sync")
			.invokeEvent({})
			.catch((error: unknown) => {
				return error;
			});

		expect(error).toBeInstanceOf(LambdaInvokeError);
		expect((error as LambdaInvokeError).message).toBe(
			"Lambda 関数の非同期呼び出しに失敗しました: media-sync",
		);
		expect((error as LambdaInvokeError).cause).toBe(sdkError);
	});
});
