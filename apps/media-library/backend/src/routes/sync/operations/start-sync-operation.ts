// In scope: asking the sync Lambda to start
// Out of scope: running the sync, waiting for it, reading the run record
import { startMediaSync } from "../../../features/media-sync-trigger/media-sync-trigger.js";
import { getLibrarySettings } from "../../../shared/library-settings.js";

/** Doesn't wait for the Lambda; the run record is what reports progress. */
export const startSyncOperation = async (): Promise<void> => {
	const settings = getLibrarySettings();

	await startMediaSync({
		functionName: settings.syncFunctionName,
		region: settings.awsRegion,
	});
};
