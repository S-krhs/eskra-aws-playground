// In scope: ffmpeg で画像・動画からサムネイルの webp を作る
// Out of scope: 寸法の読み取り、R2 への読み書き、DB への反映
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Lambda layer が /opt/bin へ配置する。ローカル検証で差し替えられるよう実行時に解決する
const resolveFfmpegPath = (): string => {
	return process.env.FFMPEG_PATH ?? "/opt/bin/ffmpeg";
};

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_QUALITY = 80;

// 動画の先頭は黒いことが多いため少し進めた位置から取る。短い動画は先頭から取る
const POSTER_SECONDS = 1;
const POSTER_MIN_DURATION_MS = 2_000;

/** サムネイル生成の入力。durationMs があれば動画として扱う。 */
export interface GenerateThumbnailInput {
	sourcePath: string;
	destinationPath: string;
	durationMs: number | undefined;
}

/** 動画から 1 フレーム抜く位置を決める。 */
export const resolvePosterSeconds = (
	durationMs: number | undefined,
): number => {
	if (durationMs === undefined || durationMs >= POSTER_MIN_DURATION_MS) {
		return POSTER_SECONDS;
	}

	return 0;
};

/**
 * サムネイルの webp を作る。
 * 高さは -2 で合わせ、codec が扱えない奇数の寸法にならないようにする。
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
