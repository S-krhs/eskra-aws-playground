import { beforeEach, describe, expect, it, vi } from "vitest";
import { startSyncOperation } from "./start-sync-operation.js";

const lambda = vi.hoisted(() => {
	return { invokeEvent: vi.fn(), constructed: vi.fn() };
});

vi.mock("@eskra-aws-playground/integration-lambda/lambda-invoker.js", () => {
	return {
		LambdaInvoker: class {
			constructor(functionName: string) {
				lambda.constructed(functionName);
			}

			invokeEvent = lambda.invokeEvent;
		},
	};
});

beforeEach(() => {
	process.env.MEDIA_SYNC_FUNCTION_NAME = "media-sync";
	lambda.invokeEvent.mockReset();
	lambda.invokeEvent.mockResolvedValue(undefined);
	lambda.constructed.mockReset();
});

describe("startSyncOperation", () => {
	it("asks the configured function to run the sync job", async () => {
		const result = await startSyncOperation();

		expect(lambda.constructed).toHaveBeenCalledWith("media-sync");
		expect(lambda.invokeEvent).toHaveBeenCalledWith({ job: "media-sync" });
		expect(result.kind).toBe("OK");
	});

	it("fails before invoking anything when the function name isn't configured", async () => {
		process.env.MEDIA_SYNC_FUNCTION_NAME = "";

		await expect(startSyncOperation()).rejects.toThrow(
			"MEDIA_SYNC_FUNCTION_NAME が設定されていません。",
		);
		expect(lambda.invokeEvent).not.toHaveBeenCalled();
	});
});
