// In scope: turning a failed query validation into an error message carrying no values
// Out of scope: the validation itself, deciding the HTTP status, route implementation
import type { ZodError } from "zod";

/**
 * Lists only the names of the fields that failed. The value that was passed never reaches the
 * response, since it would flow straight on into the screen and the logs.
 */
export const toInvalidQueryMessage = (error: ZodError): string => {
	const fields = error.issues
		.map((issue) => {
			return issue.path.join(".") || "(全体)";
		})
		.join(", ");

	return `query の項目が不正です: ${fields}`;
};
