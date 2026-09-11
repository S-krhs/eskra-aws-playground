// In scope: reading the failure out of a mutation, whichever way the failure arrived
// Out of scope: making the request, retrying, how the failure is shown

/** What the generated client resolves with: the status, and whatever body came back under it. */
const hasStatus = (
	value: unknown,
): value is { status: number; data?: unknown } => {
	return (
		typeof value === "object" &&
		value !== null &&
		"status" in value &&
		typeof value.status === "number"
	);
};

/** Every response other than a success carries the API's shared error body. */
const hasMessage = (data: unknown): data is { message: string } => {
	return (
		typeof data === "object" &&
		data !== null &&
		"message" in data &&
		typeof data.message === "string"
	);
};

/**
 * The generated client resolves a 4xx or a 5xx as a status rather than rejecting, while a request that
 * never reached the server rejects as usual. Reading only the first leaves a stopped backend looking
 * like nothing happened, so both are read here.
 * A mutation that resolves with nothing at all — one wrapping a browser API rather than the client —
 * is read through its rejection alone.
 */
export const toMutationFailure = (
	mutation: { data?: unknown; error: unknown },
	successStatus: number,
): string | undefined => {
	const response = mutation.data;

	if (
		hasStatus(response) &&
		response.status !== successStatus &&
		hasMessage(response.data)
	) {
		return response.data.message;
	}

	return mutation.error instanceof Error ? mutation.error.message : undefined;
};
