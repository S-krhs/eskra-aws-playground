// In scope: ffprobe でメディアの寸法と尺を読む
// Out of scope: サムネイルの生成、R2 への読み書き、DB への反映
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);

// Lambda layer が /opt/bin へ配置する。ローカル検証で差し替えられるよう実行時に解決する
const resolveFfprobePath = (): string => {
	return process.env.FFPROBE_PATH ?? "/opt/bin/ffprobe";
};

const probeOutputSchema = z.object({
	streams: z
		.array(
			z.object({ width: z.number().optional(), height: z.number().optional() }),
		)
		.default([]),
	// 画像には format.duration が無い
	format: z.object({ duration: z.string().optional() }).default({}),
});

/** メディアの寸法と尺。読めなかった項目は undefined になる。 */
export interface MediaProbe {
	width: number | undefined;
	height: number | undefined;
	durationMs: number | undefined;
}

/** ffprobe でメディアの寸法と尺を読む。 */
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
