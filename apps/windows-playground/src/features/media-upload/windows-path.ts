// In scope: エクスプローラーから渡される Windows のパスを WSL のパスへ変換する
// Out of scope: ファイルの読み取り、key の組み立て、R2 への通信

// C:\Users\foo\a.png / C:/Users/foo/a.png のどちらの区切りでも受ける
const WINDOWS_DRIVE_PATTERN = /^([A-Za-z]):[\\/](.*)$/s;

/**
 * Windows のドライブパスを WSL のマウントパスへ変換する。
 * `C:\Users\foo\a.png` は `/mnt/c/Users/foo/a.png` になる。
 * 既に POSIX のパスならそのまま返す(WSL から直接呼んだ場合)。
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
