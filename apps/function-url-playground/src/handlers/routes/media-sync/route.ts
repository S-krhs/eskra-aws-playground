// In scope: parsing the request, authenticating the caller, asking for the sync, shaping the response
// Out of scope: invoking the Lambda, running the sync, reporting progress

import { createHash, timingSafeEqual } from "node:crypto";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { Resource } from "sst/resource";
import type {
	FunctionUrlEvent,
	FunctionUrlResponse,
} from "@/handlers/schema.js";
import { startSyncOperation } from "./operations/start-sync-operation.js";
import { mediaSyncRequestSchema } from "./schema.js";

const logger = createBatchLogger("media-sync");

// Digesting both sides first keeps the comparison fixed-length: timingSafeEqual throws on a length
// mismatch, and answering that early would give away how long the expected token is
const matchesToken = (presented: string, expected: string): boolean => {
	return timingSafeEqual(
		createHash("sha256").update(presented).digest(),
		createHash("sha256").update(expected).digest(),
	);
};

export const mediaSyncRoute = async (
	event: FunctionUrlEvent,
): Promise<FunctionUrlResponse> => {
	// 1. Parse the request into this route's own input.
	logger.start();
	const parsedRequest = mediaSyncRequestSchema.safeParse(event);
	if (!parsedRequest.success) {
		logger.failure(new Error("Function URL request の形式が不正です。"));
		return {
			statusCode: 400,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ error: "リクエストが不正です。" }),
		};
	}

	// 2. Authenticate the parsed request. The Function URL itself takes no authorization, so an
	// unauthenticated caller has to be turned away before anything is invoked.
	if (
		!matchesToken(
			parsedRequest.data.presentedToken,
			Resource.MediaSyncToken.value,
		)
	) {
		logger.failure(new Error("同期リクエストのトークンが一致しません。"));
		return {
			statusCode: 401,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ error: "認証に失敗しました。" }),
		};
	}

	// 3. Ask for the sync. It isn't waited on and has no outcome to report beyond having been asked
	// for; the caller reads progress from the run record instead.
	try {
		await startSyncOperation();
	} catch (error) {
		logger.failure(error);
		return {
			statusCode: 500,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ error: "同期の起動に失敗しました。" }),
		};
	}
	logger.complete();

	// 4. Answer that it was accepted, not that it finished.
	return {
		statusCode: 202,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ message: "同期の起動を受け付けました。" }),
	};
};
