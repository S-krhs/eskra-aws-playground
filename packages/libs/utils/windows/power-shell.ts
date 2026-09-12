// In scope: running one PowerShell command from inside WSL and reading its output
// Out of scope: what the command says, quoting a value into it, where the result is used
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Long enough for a cold powershell.exe start, short enough that a hung one doesn't hold a caller
const POWERSHELL_TIMEOUT_MS = 15_000;

/**
 * Runs the command through the Windows-side powershell.exe and answers with its trimmed stdout.
 * A launch costs the better part of a second, so a caller that needs the same answer repeatedly is
 * the one that holds on to it.
 * Interpolating a value into `command` needs `toPowerShellLiteral`.
 */
export const runPowerShell = async (command: string): Promise<string> => {
	const { stdout } = await execFileAsync(
		"powershell.exe",
		["-NoProfile", "-NonInteractive", "-Command", command],
		{ timeout: POWERSHELL_TIMEOUT_MS },
	);

	return stdout.trim();
};
