// In scope: how numbers and timestamps read on screen
// Out of scope: fetching data, state, layout

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

export const formatByteSize = (byteSize: number): string => {
	let size = byteSize;
	let unit = 0;

	while (size >= 1024 && unit < BYTE_UNITS.length - 1) {
		size /= 1024;
		unit += 1;
	}

	return `${unit === 0 ? size : size.toFixed(1)} ${BYTE_UNITS[unit]}`;
};

/** Renders a video's duration as m:ss. */
export const formatDuration = (durationMs: number): string => {
	const totalSeconds = Math.round(durationMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/** Renders an ISO timestamp as a Japanese-style date and time. */
export const formatDateTime = (isoTimestamp: string): string => {
	return new Date(isoTimestamp).toLocaleString("ja-JP", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
};
