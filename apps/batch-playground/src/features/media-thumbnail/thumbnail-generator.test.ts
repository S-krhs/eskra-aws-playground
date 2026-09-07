// ffmpeg の実バイナリを使う検証は、layer をビルド済みの場合だけ実行される。
// 未ビルドなら `npm run build:ffmpeg-layer` で用意する。
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { probeMedia } from "./media-probe.js";
import {
	generateThumbnail,
	resolvePosterSeconds,
} from "./thumbnail-generator.js";

const execFileAsync = promisify(execFile);

const layerBinDir = resolve(
	import.meta.dirname,
	"../../../../../.tmp/layers/ffmpeg/bin",
);
const ffmpegPath = join(layerBinDir, "ffmpeg");
const hasFfmpeg = existsSync(ffmpegPath);

describe("resolvePosterSeconds", () => {
	it("十分に長い動画は 1 秒地点から取る", () => {
		expect(resolvePosterSeconds(10_000)).toBe(1);
	});

	// 1 秒に満たない動画で -ss 1 を指定すると 1 フレームも取れない
	it("短い動画は先頭から取る", () => {
		expect(resolvePosterSeconds(500)).toBe(0);
	});

	it("尺が読めなければ既定の位置から取る", () => {
		expect(resolvePosterSeconds(undefined)).toBe(1);
	});
});

describe.skipIf(!hasFfmpeg)("ffmpeg を使う生成", () => {
	let workDir: string;

	beforeAll(async () => {
		process.env.FFMPEG_PATH = ffmpegPath;
		process.env.FFPROBE_PATH = join(layerBinDir, "ffprobe");
		workDir = await mkdtemp(join(tmpdir(), "media-thumbnail-"));
	});

	afterAll(async () => {
		await rm(workDir, { recursive: true, force: true });
	});

	const buildImage = async (): Promise<string> => {
		const path = join(workDir, "source.png");
		await execFileAsync(ffmpegPath, [
			"-hide_banner",
			"-loglevel",
			"error",
			"-f",
			"lavfi",
			"-i",
			"testsrc=size=1920x1080:duration=1",
			"-frames:v",
			"1",
			path,
			"-y",
		]);

		return path;
	};

	const buildVideo = async (): Promise<string> => {
		const path = join(workDir, "source.mp4");
		await execFileAsync(ffmpegPath, [
			"-hide_banner",
			"-loglevel",
			"error",
			"-f",
			"lavfi",
			"-i",
			"testsrc=size=1280x720:duration=3:rate=24",
			"-c:v",
			"libx264",
			"-pix_fmt",
			"yuv420p",
			path,
			"-y",
		]);

		return path;
	};

	it("画像の寸法を読み、尺は空にする", async () => {
		const probe = await probeMedia(await buildImage());

		expect(probe.width).toBe(1920);
		expect(probe.height).toBe(1080);
		expect(probe.durationMs).toBeUndefined();
	});

	it("動画の寸法と尺を読む", async () => {
		const probe = await probeMedia(await buildVideo());

		expect(probe.width).toBe(1280);
		expect(probe.height).toBe(720);
		expect(probe.durationMs).toBe(3000);
	});

	it("画像から幅 320 の webp を作る", async () => {
		const destinationPath = join(workDir, "image.webp");
		await generateThumbnail({
			sourcePath: await buildImage(),
			destinationPath,
			durationMs: undefined,
		});

		const probe = await probeMedia(destinationPath);
		expect(probe.width).toBe(320);
		expect(probe.height).toBe(180);
	});

	it("動画から幅 320 の webp を作る", async () => {
		const destinationPath = join(workDir, "video.webp");
		await generateThumbnail({
			sourcePath: await buildVideo(),
			destinationPath,
			durationMs: 3000,
		});

		const probe = await probeMedia(destinationPath);
		expect(probe.width).toBe(320);
		expect(probe.height).toBe(180);
	});
});
