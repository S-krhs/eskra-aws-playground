// In scope: converting the Windows path Explorer hands over into a WSL path
// Out of scope: reading the file, key construction, talking to R2

// Accepts either separator: C:\Users\foo\a.png or C:/Users/foo/a.png
const WINDOWS_DRIVE_PATTERN = /^([A-Za-z]):[\\/](.*)$/s;

/**
 * `C:\Users\foo\a.png` becomes `/mnt/c/Users/foo/a.png`.
 * A path that is already POSIX comes back untouched (called straight from WSL).
 */
export const toWslPath = (path: string): string => {
	if (path.startsWith("/")) {
		return path;
	}

	const matched = WINDOWS_DRIVE_PATTERN.exec(path);

	if (!matched) {
		throw new Error(
			`Windows のドライブパスとして解釈できませんでした: ${path}`,
		);
	}

	const [, driveLetter, rest] = matched as unknown as [string, string, string];

	return `/mnt/${driveLetter.toLowerCase()}/${rest.replaceAll("\\", "/")}`;
};
