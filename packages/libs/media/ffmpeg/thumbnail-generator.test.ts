// The checks against the real ffmpeg binaries only run once the layer is built.
// Build it with `npm run build:ffmpeg-layer` if it isn't.
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
	"../../../../.tmp/layers/ffmpeg/bin",
);
const ffmpegPath = join(layerBinDir, "ffmpeg");
const hasFfmpeg = existsSync(ffmpegPath);

describe("resolvePosterSeconds", () => {
	it("takes the frame at 1 second from a long enough video", () => {
		expect(resolvePosterSeconds(10_000)).toBe(1);
	});

	// -ss 1 on a video under a second yields no frame at all
	it("takes the frame from the start of a short video", () => {
		expect(resolvePosterSeconds(500)).toBe(0);
	});

	it("falls back to the default position when the duration is unreadable", () => {
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

	it("reads an image's dimensions and leaves the duration empty", async () => {
		const probe = await probeMedia(await buildImage());

		expect(probe.width).toBe(1920);
		expect(probe.height).toBe(1080);
		expect(probe.durationMs).toBeUndefined();
	});

	it("reads a video's dimensions and duration", async () => {
		const probe = await probeMedia(await buildVideo());

		expect(probe.width).toBe(1280);
		expect(probe.height).toBe(720);
		expect(probe.durationMs).toBe(3000);
	});

	it("makes a 320-wide webp from an image", async () => {
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

	it("makes a 320-wide webp from a video", async () => {
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
