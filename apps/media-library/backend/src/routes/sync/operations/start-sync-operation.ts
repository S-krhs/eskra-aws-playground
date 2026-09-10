// In scope: asking the sync endpoint to start a run, and resolving where that endpoint is
// Out of scope: running the sync, waiting for it, reading the run record
import type { OperationResult } from "../../_shared/intermediate-models/operation-result.js";

// Long enough for a cold Lambda to accept the request, short enough that the UI's sync button doesn't
// hang on an endpoint that never answers
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Starts the sync without waiting for it — a sync takes minutes, so progress is read from the run
 * record instead. A second start is refused by the sync job itself, which takes the one run slot the
 * DB allows, so nothing guards against it here.
 */
export const startSyncOperation = async (): Promise<OperationResult<void>> => {
	const endpointUrl = process.env.MEDIA_SYNC_ENDPOINT_URL;

	if (!endpointUrl) {
		throw new Error("MEDIA_SYNC_ENDPOINT_URL が設定されていません。");
	}

	const token = process.env.MEDIA_SYNC_TOKEN;

	if (!token) {
		throw new Error("MEDIA_SYNC_TOKEN が設定されていません。");
	}

	const response = await fetch(endpointUrl, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});

	// Only the status goes into the message — the endpoint's own body would end up in the local log,
	// and this request carries a token
	if (!response.ok) {
		throw new Error(`同期の起動依頼が拒否されました: ${response.status}`);
	}

	return { kind: "OK", data: undefined };
};
