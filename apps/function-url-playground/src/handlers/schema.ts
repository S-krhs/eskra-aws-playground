// In scope: the external-input schema and types for the Function URL Lambda's event and interaction body, plus the HTTP response type
// Out of scope: signature verification, judging a selection, assembling the response body
import { z } from "zod";

/** The Lambda Function URL event this Lambda receives; rawPath picks the route. */
export const functionUrlEventSchema = z.object({
	rawPath: z.string(),
	headers: z.record(z.string(), z.string()),
	body: z.string().optional(),
	isBase64Encoded: z.boolean().optional(),
});

export type FunctionUrlEvent = z.infer<typeof functionUrlEventSchema>;

export interface FunctionUrlResponse {
	statusCode: number;
	headers: Record<string, string>;
	body: string;
}
