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

export const readRejection = (error: unknown): string => {
	return error instanceof Error ? error.message : String(error);
};

/** Undefined when the response is a success. */
export const readResponseFailure = (response: unknown): string | undefined => {
	if (!hasStatus(response) || response.status < 400) {
		return undefined;
	}

	// A body that isn't this API's leaves only the status to go on, which still beats reading as a success
	return hasMessage(response.data)
		? response.data.message
		: `HTTP ${response.status}`;
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
		return { kind: "failed", message: readRejection(mutation.error) };
	}

	const failure = readResponseFailure(mutation.data);

	if (failure !== undefined) {
		return { kind: "failed", message: failure };
	}

	return mutation.isSuccess ? { kind: "done" } : { kind: "idle" };
};
