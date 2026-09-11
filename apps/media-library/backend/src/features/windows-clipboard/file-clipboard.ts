// In scope: putting one file on the Windows clipboard from inside WSL
// Out of scope: reading the media out of storage, HTTP status codes, what the screen does with it
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { promisify } from "node:util";
import { toWslPath } from "@eskra-aws-playground/libs/path/windows-path.js";

const execFileAsync = promisify(execFile);

// Long enough for a cold powershell.exe start, short enough that a hung one doesn't hold the request
const POWERSHELL_TIMEOUT_MS = 15_000;

// The file has to sit somewhere Windows itself can open: a \\wsl$ path pastes as a network path, and an
// app that reads the pasted file later may no longer reach it
const CLIPBOARD_DIRECTORY_NAME = "eskra-media-library";

/**
 * The name comes from the object's own metadata, which anyone who can write to the bucket can set, so
 * it is cut down to a bare file name before it becomes part of a path.
 */
export const toSafeFileName = (fileName: string): string => {
	// basename only treats "/" as a separator, so a Windows-style name is turned over to it first
	const name = basename(fileName.replaceAll("\\", "/"));

	return name === "" || name === "." || name === ".." ? "media" : name;
};

/** Single-quoted with the quote itself doubled: how PowerShell reads a string it interpolates nothing into. */
const toPowerShellLiteral = (value: string): string => {
	return `'${value.replaceAll("'", "''")}'`;
};

const runPowerShell = async (command: string): Promise<string> => {
	const { stdout } = await execFileAsync(
		"powershell.exe",
		["-NoProfile", "-NonInteractive", "-Command", command],
		{ timeout: POWERSHELL_TIMEOUT_MS },
	);

	return stdout.trim();
};

// Asked of Windows once per process: starting powershell.exe costs the better part of a second, and
// TEMP can't move while the session is up
let windowsTempDirectory: Promise<string> | undefined;

const resolveWindowsTempDirectory = async (): Promise<string> => {
	windowsTempDirectory ??= runPowerShell("$env:TEMP");

	return await windowsTempDirectory;
};

/**
 * Writes the body under the Windows user's TEMP and puts that file on the clipboard, so it pastes as a
 * file — into Explorer, or into a chat window as an attachment — rather than as an image.
 *
 * The file is left behind on purpose: the clipboard holds a reference to it, so removing it would
 * empty the paste, and Windows clears TEMP on its own schedule. It is written afresh on every copy,
 * since the content behind an id can have been replaced since the last one.
 */
export const copyFileToWindowsClipboard = async (input: {
	mediaId: string;
	fileName: string;
	body: ReadableStream<Uint8Array>;
}): Promise<void> => {
	const fileName = toSafeFileName(input.fileName);
	// One directory per media, so two files sharing a name still paste under their own
	const windowsDirectory = `${await resolveWindowsTempDirectory()}\\${CLIPBOARD_DIRECTORY_NAME}\\${input.mediaId}`;
	const directory = toWslPath(windowsDirectory);

	await mkdir(directory, { recursive: true });
	await writeFile(`${directory}/${fileName}`, input.body);
	await runPowerShell(
		`Set-Clipboard -LiteralPath ${toPowerShellLiteral(`${windowsDirectory}\\${fileName}`)}`,
	);
};
