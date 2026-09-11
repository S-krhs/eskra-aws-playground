// In scope: where one mutation stands, and the failure it ended at whichever way that arrived
// Out of scope: making the request, retrying, the words shown for any of it

/**
 * Where one mutation stands, and the wording a failure arrived with — the backend's own, or the
 * browser's for a request that never got there. Only a failure carries one; what to say about the
 * rest is the screen's to write.
 */
export interface MutationStatus {
	kind: "idle" | "pending" | "done" | "failed";
	message?: string;
}

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

/** Every failure this API answers with carries its shared error body. */
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
 */
export const toMutationStatus = (mutation: {
	isPending: boolean;
	isError: boolean;
	isSuccess: boolean;
	data?: unknown;
	error: unknown;
}): MutationStatus => {
	if (mutation.isPending) {
		return { kind: "pending" };
	}

	if (mutation.isError) {
		return {
			kind: "failed",
			message:
				mutation.error instanceof Error
					? mutation.error.message
					: String(mutation.error),
		};
	}

	const response = mutation.data;

	if (hasStatus(response) && response.status >= 400) {
		return {
			kind: "failed",
			// A body that isn't this API's leaves only the status to go on, which still beats reading as a success
			message: hasMessage(response.data)
				? response.data.message
				: `HTTP ${response.status}`,
		};
	}

	return mutation.isSuccess ? { kind: "done" } : { kind: "idle" };
};
