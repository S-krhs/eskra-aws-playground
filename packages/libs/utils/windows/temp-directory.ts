// In scope: asking Windows where its per-user temporary directory is
// Out of scope: writing anything there, converting the path, caching the answer
import { runPowerShell } from "./power-shell.js";

/**
 * The Windows path of the user's TEMP, as Windows itself reports it (`C:\Users\...\Temp`).
 * A file has to sit under it for a Windows application to open it — a `\\wsl$` path arrives as a
 * network path, which an app that reads it later may no longer reach.
 */
export const resolveWindowsTempDirectory = async (): Promise<string> => {
	return await runPowerShell("$env:TEMP");
};
