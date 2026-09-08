// In scope: reading a media file's dimensions and duration with ffprobe
// Out of scope: generating a thumbnail, fetching the file or storing what came out of it
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

// The Lambda layer puts this under /opt/bin; the path resolves at call time so a local test can swap it
const resolveFfprobePath = (): string => {
	return process.env.FFPROBE_PATH ?? "/opt/bin/ffprobe";
};

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

export const probeMedia = async (filePath: string): Promise<MediaProbe> => {
	const { stdout } = await execFileAsync(resolveFfprobePath(), [
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
	]);

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
