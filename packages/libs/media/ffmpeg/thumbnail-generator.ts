// In scope: making a webp thumbnail out of an image or video with ffmpeg
// Out of scope: reading dimensions, fetching the file or storing what came out of it
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// The Lambda layer puts these under /opt/bin; the path resolves at call time so a local test can swap it
const resolveFfmpegPath = (): string => {
	return process.env.FFMPEG_PATH ?? "/opt/bin/ffmpeg";
};

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_QUALITY = 80;

// A video usually opens on black, so the frame comes from slightly in; a short one comes from the start
const POSTER_SECONDS = 1;
const POSTER_MIN_DURATION_MS = 2_000;

/** A durationMs means it is treated as a video. */
export interface GenerateThumbnailInput {
	sourcePath: string;
	destinationPath: string;
	durationMs: number | undefined;
}

/** Picks where in a video the single frame comes from. */
export const resolvePosterSeconds = (
	durationMs: number | undefined,
): number => {
	if (durationMs === undefined || durationMs >= POSTER_MIN_DURATION_MS) {
		return POSTER_SECONDS;
	}

	return 0;
};

/**
 * Height is matched with -2, keeping the dimensions off the odd numbers a codec can't handle.
 */
export const generateThumbnail = async (
	input: GenerateThumbnailInput,
): Promise<void> => {
	const seekArguments =
		input.durationMs === undefined
			? []
			: ["-ss", String(resolvePosterSeconds(input.durationMs))];

	await execFileAsync(resolveFfmpegPath(), [
		"-hide_banner",
		"-loglevel",
		"error",
		...seekArguments,
		"-i",
		input.sourcePath,
		"-frames:v",
		"1",
		"-vf",
		`scale=${THUMBNAIL_WIDTH}:-2`,
		"-c:v",
		"libwebp",
		"-quality",
		String(THUMBNAIL_QUALITY),
		input.destinationPath,
		"-y",
	]);
};
