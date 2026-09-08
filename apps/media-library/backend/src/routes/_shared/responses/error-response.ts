// In scope: the error response every route shares, and turning a failed validation into one
// Out of scope: deciding the status code, the validation itself, route implementation
import { z } from "@hono/zod-openapi";
import type { ZodError } from "zod";

/** Every failure comes back in this shape, so the screen has one thing to read. */
export const errorResponseSchema = z.object({
	message: z.string(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/** Names the fields that failed and nothing that was passed — a value here would land in a log and on the screen. */
export const toInvalidRequestResponse = (error: ZodError): ErrorResponse => {
	const fields = error.issues
		.map((issue) => {
			return issue.path.join(".") || "(全体)";
		})
		.join(", ");

	return { message: `リクエストの項目が不正です: ${fields}` };
};
