// In scope: putting one media file where Windows can reach it, and onto the Windows clipboard
// Out of scope: reading the media out of storage, how PowerShell is run, HTTP status codes
import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { runPowerShell } from "@eskra-aws-playground/libs/windows/power-shell.js";
import { toPowerShellLiteral } from "@eskra-aws-playground/libs/windows/power-shell-literal.js";
import { resolveWindowsTempDirectory } from "@eskra-aws-playground/libs/windows/temp-directory.js";
import { toWslPath } from "@eskra-aws-playground/libs/windows/wsl-path.js";

// Under the Windows user's TEMP: the file has to be somewhere Windows itself can open, and TEMP is
// cleared on its own schedule
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

// Asked of Windows once per process, since each launch of powershell.exe costs the better part of a
// second and TEMP can't move while the session is up
let windowsTempDirectory: Promise<string> | undefined;

/**
 * Writes the body under the Windows user's TEMP and puts that file on the clipboard, so it pastes as a
 * file — into Explorer, or into a chat window as an attachment — rather than as an image.
 *
 * The file is left behind on purpose: the clipboard holds a reference to it, so removing it would
 * empty the paste. It is written afresh on every copy, since the content behind an id can have been
 * replaced since the last one.
 */
export const copyFileToWindowsClipboard = async (input: {
	mediaId: string;
	fileName: string;
	body: ReadableStream<Uint8Array>;
}): Promise<void> => {
	const fileName = toSafeFileName(input.fileName);
	windowsTempDirectory ??= resolveWindowsTempDirectory();
	// One directory per media, so two files sharing a name still paste under their own
	const windowsDirectory = `${await windowsTempDirectory}\\${CLIPBOARD_DIRECTORY_NAME}\\${input.mediaId}`;
	const directory = toWslPath(windowsDirectory);

	await mkdir(directory, { recursive: true });
	await writeFile(`${directory}/${fileName}`, input.body);
	await runPowerShell(
		`Set-Clipboard -LiteralPath ${toPowerShellLiteral(`${windowsDirectory}\\${fileName}`)}`,
	);
};
