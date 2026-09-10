// In scope: making a webp thumbnail out of an image or video with ffmpeg
// Out of scope: reading dimensions, fetching the file or storing what came out of it
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Where the Lambda layer puts the binary
const DEFAULT_FFMPEG_PATH = "/opt/bin/ffmpeg";
// Only one frame is decoded however long the video is, so nothing legitimate comes near this
const DEFAULT_TIMEOUT_MS = 60_000;

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_QUALITY = 80;

// A 320-wide webp is a few KB; this only has to be above anything an extreme aspect ratio could reach
const MAX_THUMBNAIL_BYTES = 8 * 1024 * 1024;

// A video usually opens on black, so the frame comes from slightly in; a short one comes from the start
const POSTER_SECONDS = 1;
const POSTER_MIN_DURATION_MS = 2_000;

export interface GenerateThumbnailInput {
	sourcePath: string;
	/** Where the frame is taken from. 0 for a still image, `resolvePosterSeconds` for a video. */
	seekSeconds: number;
}

export interface GenerateThumbnailOptions {
	/** Defaults to `FFMPEG_PATH`, then to the Lambda layer's path. */
	ffmpegPath?: string;
	timeoutMs?: number;
}

/**
 * Picks where in a video the single frame comes from. An unreadable duration is treated as long
 * enough — `generateThumbnail` falls back to the start if that turns out to be past the end.
 */
export const resolvePosterSeconds = (
	durationMs: number | undefined,
): number => {
	if (durationMs === undefined || durationMs >= POSTER_MIN_DURATION_MS) {
		return POSTER_SECONDS;
	}

	return 0;
};

/**
 * Returns the webp bytes. ffmpeg writes them to stdout, so no temporary file is involved.
 * Height is matched with -2, keeping the dimensions off the odd numbers a codec can't handle.
 */
export const generateThumbnail = async (
	input: GenerateThumbnailInput,
	options: GenerateThumbnailOptions = {},
): Promise<Buffer> => {
	const executablePath =
		options.ffmpegPath ?? process.env.FFMPEG_PATH ?? DEFAULT_FFMPEG_PATH;
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	const poster = await runFfmpeg(
		executablePath,
		input.sourcePath,
		input.seekSeconds,
		timeoutMs,
	);

	// ffmpeg exits 0 having written nothing when the seek position is past the end, which a video
	// whose duration was unreadable can turn out to be. The start is the only frame left to take
	const thumbnail =
		poster.length === 0 && input.seekSeconds > 0
			? await runFfmpeg(executablePath, input.sourcePath, 0, timeoutMs)
			: poster;

	if (thumbnail.length === 0) {
		throw new Error("ffmpeg がサムネイルのフレームを取得できませんでした");
	}

	return thumbnail;
};

const runFfmpeg = async (
	executablePath: string,
	sourcePath: string,
	seekSeconds: number,
	timeoutMs: number,
): Promise<Buffer> => {
	try {
		const { stdout } = await execFileAsync(
			executablePath,
			[
				"-hide_banner",
				"-loglevel",
				"error",
				"-ss",
				String(seekSeconds),
				"-i",
				sourcePath,
				"-frames:v",
				"1",
				"-vf",
				`scale=${THUMBNAIL_WIDTH}:-2`,
				"-c:v",
				"libwebp",
				"-quality",
				String(THUMBNAIL_QUALITY),
				"-f",
				"webp",
				"pipe:1",
			],
			{
				encoding: "buffer",
				maxBuffer: MAX_THUMBNAIL_BYTES,
				timeout: timeoutMs,
			},
		);

		return stdout;
	} catch (error) {
		// A file ffmpeg cannot make sense of can keep it running until the Lambda itself times out
		if (isTimedOutError(error)) {
			throw new Error(`ffmpeg がタイムアウトしました: ${timeoutMs}ms`);
		}

		throw error;
	}
};

// execFile reports the kill it sends at the timeout only as this pair
const isTimedOutError = (error: unknown): boolean => {
	return (
		error instanceof Error &&
		"killed" in error &&
		error.killed === true &&
		"signal" in error &&
		error.signal === "SIGTERM"
	);
};
