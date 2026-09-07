// In scope: 画面に出す数値と日時の表記
// Out of scope: データの取得、状態管理、レイアウト

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

/** バイト数を人が読める単位へ丸める。 */
export const formatByteSize = (byteSize: number): string => {
	let size = byteSize;
	let unit = 0;

	while (size >= 1024 && unit < BYTE_UNITS.length - 1) {
		size /= 1024;
		unit += 1;
	}

	return `${unit === 0 ? size : size.toFixed(1)} ${BYTE_UNITS[unit]}`;
};

/** 動画の尺を m:ss で表す。 */
export const formatDuration = (durationMs: number): string => {
	const totalSeconds = Math.round(durationMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/** アップロード日時を日本語表記の年月日と時刻にする。 */
export const formatUploadedAt = (uploadedAt: string): string => {
	return new Date(uploadedAt).toLocaleString("ja-JP", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
};
