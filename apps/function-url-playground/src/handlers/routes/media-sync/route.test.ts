import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FunctionUrlEvent } from "@/handlers/schema.js";
import { paths } from "../../contracts/paths.js";
import { mediaSyncRoute } from "./route.js";

vi.mock("sst/resource", () => {
	return {
		Resource: {
			MediaSyncToken: { value: "sync-token" },
		},
	};
});

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

const buildEvent = (headers: Record<string, string>): FunctionUrlEvent => {
	return {
		rawPath: paths.mediaSync,
		headers,
	};
};

beforeEach(() => {
	process.env.MEDIA_SYNC_FUNCTION_NAME = "media-sync";
	lambda.invokeEvent.mockReset();
	lambda.invokeEvent.mockResolvedValue(undefined);
	lambda.constructed.mockReset();
});

describe("mediaSyncRoute", () => {
	it("asks the sync Lambda to run and answers 202 on a matching token", async () => {
		const response = await mediaSyncRoute(
			buildEvent({ authorization: "Bearer sync-token" }),
		);

		expect(lambda.constructed).toHaveBeenCalledWith("media-sync");
		expect(lambda.invokeEvent).toHaveBeenCalledWith({ job: "media-sync" });
		expect(response.statusCode).toBe(202);
	});

	it("returns 401 and invokes nothing on a token that doesn't match", async () => {
		const response = await mediaSyncRoute(
			buildEvent({ authorization: "Bearer wrong-token" }),
		);

		expect(response.statusCode).toBe(401);
		expect(lambda.invokeEvent).not.toHaveBeenCalled();
	});

	it("returns 401 and invokes nothing when the header is absent or isn't a bearer token", async () => {
		await expect(mediaSyncRoute(buildEvent({}))).resolves.toMatchObject({
			statusCode: 401,
		});
		await expect(
			mediaSyncRoute(buildEvent({ authorization: "sync-token" })),
		).resolves.toMatchObject({ statusCode: 401 });

		expect(lambda.invokeEvent).not.toHaveBeenCalled();
	});

	it("returns 500 without repeating the failure's detail when the invoke fails", async () => {
		lambda.invokeEvent.mockRejectedValue(
			new Error("Lambda 関数の非同期呼び出しに失敗しました: media-sync"),
		);

		const response = await mediaSyncRoute(
			buildEvent({ authorization: "Bearer sync-token" }),
		);

		expect(response.statusCode).toBe(500);
		expect(JSON.parse(response.body)).toEqual({
			error: "同期の起動に失敗しました。",
		});
	});
});
