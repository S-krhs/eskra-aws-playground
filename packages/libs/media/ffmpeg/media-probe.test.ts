// The checks against the real ffprobe binary only run once the layer is built.
// Build it with `npm run build:ffmpeg-layer` if it isn't.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { probeMedia } from "./media-probe.js";

const execFileAsync = promisify(execFile);

// The layer is built into the repo root, found by walking up so that where this file sits or runs
// from does not decide whether the checks below are skipped
const findRepoRoot = (): string => {
	let directory = import.meta.dirname;

	while (!existsSync(join(directory, "package-lock.json"))) {
		const parent = dirname(directory);
		if (parent === directory) {
			throw new Error("リポジトリルートが見つかりませんでした");
		}
		directory = parent;
	}

	return directory;
};

const layerBinDir = join(findRepoRoot(), ".tmp", "layers", "ffmpeg", "bin");
const ffmpegPath = join(layerBinDir, "ffmpeg");
const ffprobePath = join(layerBinDir, "ffprobe");
const hasFfmpeg = existsSync(ffmpegPath);

describe("probeMedia against a stubbed ffprobe", () => {
	let workDir: string;
	let stubCount = 0;

	beforeAll(async () => {
		workDir = await mkdtemp(join(tmpdir(), "media-probe-stub-"));
	});

	afterAll(async () => {
		await rm(workDir, { recursive: true, force: true });
	});

	// A script standing in for ffprobe, so the parsing is checked without the layer being built
	const buildStub = async (body: string): Promise<string> => {
		stubCount += 1;
		const path = join(workDir, `ffprobe-stub-${stubCount}`);
		await writeFile(path, `#!${process.execPath}\n${body}\n`, { mode: 0o755 });

		return path;
	};

	const buildPrintingStub = async (output: unknown): Promise<string> => {
		return buildStub(
			`process.stdout.write(${JSON.stringify(JSON.stringify(output))});`,
		);
	};

	it("reads the dimensions and the duration in milliseconds", async () => {
		const stubPath = await buildPrintingStub({
			streams: [{ width: 1280, height: 720 }],
			format: { duration: "3.500000" },
		});

		expect(
			await probeMedia("/any/source.mp4", { ffprobePath: stubPath }),
		).toEqual({ width: 1280, height: 720, durationMs: 3500 });
	});

	it("leaves the duration empty when the format carries none", async () => {
		const stubPath = await buildPrintingStub({
			streams: [{ width: 1920, height: 1080 }],
			format: {},
		});

		expect(
			await probeMedia("/any/source.png", { ffprobePath: stubPath }),
		).toEqual({ width: 1920, height: 1080, durationMs: undefined });
	});

	it("leaves the duration empty when ffprobe reports it as N/A", async () => {
		const stubPath = await buildPrintingStub({
			streams: [{ width: 1920, height: 1080 }],
			format: { duration: "N/A" },
		});

		expect(
			await probeMedia("/any/source.mkv", { ffprobePath: stubPath }),
		).toEqual({ width: 1920, height: 1080, durationMs: undefined });
	});

	// An audio file, or a video whose stream ffprobe could not read
	it("leaves the dimensions empty when there is no video stream", async () => {
		const stubPath = await buildPrintingStub({
			streams: [],
			format: { duration: "12" },
		});

		expect(
			await probeMedia("/any/source.m4a", { ffprobePath: stubPath }),
		).toEqual({ width: undefined, height: undefined, durationMs: 12_000 });
	});

	it("fails once ffprobe runs past the timeout", async () => {
		const stubPath = await buildStub("setTimeout(() => {}, 10_000);");

		await expect(
			probeMedia("/any/source.mp4", { ffprobePath: stubPath, timeoutMs: 100 }),
		).rejects.toThrow(/タイムアウトしました: 100ms/);
	});
});

describe.skipIf(!hasFfmpeg)("probeMedia against the real ffprobe", () => {
	let workDir: string;

	beforeAll(async () => {
		workDir = await mkdtemp(join(tmpdir(), "media-probe-"));
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
		const probe = await probeMedia(await buildImage(), { ffprobePath });

		expect(probe.width).toBe(1920);
		expect(probe.height).toBe(1080);
		expect(probe.durationMs).toBeUndefined();
	});

	it("reads a video's dimensions and duration", async () => {
		const probe = await probeMedia(await buildVideo(), { ffprobePath });

		expect(probe.width).toBe(1280);
		expect(probe.height).toBe(720);
		expect(probe.durationMs).toBe(3000);
	});
});
