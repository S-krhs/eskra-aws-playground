// In scope: creating the R2 client, reusing one instance for the process's lifetime
// Out of scope: loading the config, object operations, interpreting HTTP
import {
	createR2Client,
	type R2Client,
} from "@eskra-aws-playground/integration-r2/r2-client.js";
import { getLibrarySettings } from "./library-settings.js";

let client: R2Client | undefined;

/** Resolved from the already-loaded settings, so loadLibrarySettings has to run first. */
export const getR2Client = (): R2Client => {
	if (client) {
		return client;
	}

	client = createR2Client(getLibrarySettings().credentials);

	return client;
};
