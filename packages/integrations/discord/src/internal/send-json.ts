// In scope: shared timeout handling, response checking, and error shaping for a JSON send (POST/PUT/PATCH) to a Discord API
// Out of scope: a specific API's URL construction, resolving credentials, building a payload
import {
	sanitizeText,
	type TextReplacement,
} from "@eskra-aws-playground/libs/string/text-sanitizer.js";

/** Sanitized. */
export interface JsonResponseDetails {
	status: number;
	body: string;
}

export interface JsonSendRequest {
	url: string;
	/** PUT for an idempotent full replace (e.g. overwriting a whole command list); PATCH for a partial update to an existing resource. */
	method: "POST" | "PUT" | "PATCH";
	headers?: Record<string, string>;
	payload: unknown;
	timeoutMs: number;
	/** API name used as the subject of an error message, e.g. "Discord Webhook". */
	apiLabel: string;
	/** Redaction rules applied to a failure response's body. */
	responseBodyReplacements?: readonly TextReplacement[];
	/** Builds this API's own error type. */
	createError: (message: string, responseDetails?: unknown) => Error;
}

/** Throws via `createError` on failure. */
export const sendJson = async (request: JsonSendRequest): Promise<void> => {
	const {
		url,
		method,
		headers = {},
		payload,
		timeoutMs,
		apiLabel,
		responseBodyReplacements = [],
		createError,
	} = request;

	if (typeof globalThis.fetch !== "function") {
		throw createError("ランタイムに fetch がありません");
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort();
	}, timeoutMs);

	let response: Response;
	try {
		response = await fetch(url, {
			method,
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			throw createError(
				`${apiLabel} リクエストがタイムアウトしました: ${timeoutMs}ms`,
				{
					timeoutMs,
				},
			);
		}

		throw error;
	} finally {
		clearTimeout(timeoutId);
	}

	if (!response.ok) {
		const responseDetails: JsonResponseDetails = {
			status: response.status,
			body: sanitizeText(await response.text(), {
				replacements: responseBodyReplacements,
			}),
		};

		throw createError(
			`${apiLabel} 応答が失敗しました: ${response.status}`,
			responseDetails,
		);
	}
};
