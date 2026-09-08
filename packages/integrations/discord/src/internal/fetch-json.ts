// In scope: shared timeout handling, response checking, and error shaping for a JSON GET against a Discord API, returning the parsed body
// Out of scope: a specific API's URL construction, resolving credentials, interpreting what the response means
import {
	sanitizeText,
	type TextReplacement,
} from "@eskra-aws-playground/libs/string/text-sanitizer.js";

export interface JsonFetchRequest {
	url: string;
	headers?: Record<string, string>;
	timeoutMs: number;
	/** API name used as the subject of an error message, e.g. "Discord Command API". */
	apiLabel: string;
	/** Redaction rules applied to a failure response's body. */
	responseBodyReplacements?: readonly TextReplacement[];
	/** Builds this API's own error type. */
	createError: (message: string, responseDetails?: unknown) => Error;
}

/** Throws via `createError` on failure. */
export const fetchJson = async <T>(request: JsonFetchRequest): Promise<T> => {
	const {
		url,
		headers = {},
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
			method: "GET",
			headers,
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
		throw createError(`${apiLabel} 応答が失敗しました: ${response.status}`, {
			status: response.status,
			body: sanitizeText(await response.text(), {
				replacements: responseBodyReplacements,
			}),
		});
	}

	return (await response.json()) as T;
};
