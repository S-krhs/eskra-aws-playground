// In scope: reading a media file's dimensions and duration with ffprobe
// Out of scope: generating a thumbnail, fetching the file or storing what came out of it
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

// Where the Lambda layer puts the binary
const DEFAULT_FFPROBE_PATH = "/opt/bin/ffprobe";
const DEFAULT_TIMEOUT_MS = 10_000;

// The json for one file is a few KB; the cap is only here to bound what a broken binary can print
const MAX_PROBE_OUTPUT_BYTES = 1024 * 1024;

const probeOutputSchema = z.object({
	streams: z
		.array(
			z.object({ width: z.number().optional(), height: z.number().optional() }),
		)
		.default([]),
	// An image has no format.duration
	format: z.object({ duration: z.string().optional() }).default({}),
});

/** A media file's dimensions and duration; anything unreadable comes back undefined. */
export interface MediaProbe {
	width: number | undefined;
	height: number | undefined;
	durationMs: number | undefined;
}

export interface ProbeMediaOptions {
	/** Defaults to `FFPROBE_PATH`, then to the Lambda layer's path. */
	ffprobePath?: string;
	timeoutMs?: number;
}

export const probeMedia = async (
	filePath: string,
	options: ProbeMediaOptions = {},
): Promise<MediaProbe> => {
	const stdout = await runFfprobe(
		options.ffprobePath ?? process.env.FFPROBE_PATH ?? DEFAULT_FFPROBE_PATH,
		filePath,
		options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
	);

	const parsed = probeOutputSchema.parse(JSON.parse(stdout));
	const stream = parsed.streams[0];
	const durationSeconds = Number(parsed.format.duration);

	return {
		width: stream?.width,
		height: stream?.height,
		durationMs: Number.isFinite(durationSeconds)
			? Math.round(durationSeconds * 1000)
			: undefined,
	};
};

const runFfprobe = async (
	executablePath: string,
	filePath: string,
	timeoutMs: number,
): Promise<string> => {
	try {
		const { stdout } = await execFileAsync(
			executablePath,
			[
				"-v",
				"error",
				"-select_streams",
				"v:0",
				"-show_entries",
				"stream=width,height",
				"-show_entries",
				"format=duration",
				"-of",
				"json",
				filePath,
			],
			{ maxBuffer: MAX_PROBE_OUTPUT_BYTES, timeout: timeoutMs },
		);

		return stdout;
	} catch (error) {
		// A file ffprobe cannot make sense of can keep it running until the Lambda itself times out
		if (isTimedOutError(error)) {
			throw new Error(`ffprobe がタイムアウトしました: ${timeoutMs}ms`);
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
