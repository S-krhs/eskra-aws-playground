// The checks against the real ffmpeg binaries only run once the layer is built.
// Build it with `npm run build:ffmpeg-layer` if it isn't.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { probeMedia } from "./media-probe.js";
import {
	generateThumbnail,
	resolvePosterSeconds,
} from "./thumbnail-generator.js";

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

describe("generateThumbnail against a stubbed ffmpeg", () => {
	let workDir: string;
	let stubCount = 0;

	beforeAll(async () => {
		workDir = await mkdtemp(join(tmpdir(), "media-thumbnail-stub-"));
	});

	afterAll(async () => {
		await rm(workDir, { recursive: true, force: true });
	});

	// A script standing in for ffmpeg, so what gets run is checked without the layer being built
	const buildStub = async (body: string): Promise<string> => {
		stubCount += 1;
		const path = join(workDir, `ffmpeg-stub-${stubCount}`);
		await writeFile(path, `#!${process.execPath}\n${body}\n`, { mode: 0o755 });

		return path;
	};

	it("seeks to the position it was given", async () => {
		const stubPath = await buildStub(
			'process.stdout.write(process.argv.slice(2).join(" "));',
		);

		const thumbnail = await generateThumbnail(
			{ sourcePath: "/any/source.mp4", seekSeconds: 1 },
			{ ffmpegPath: stubPath },
		);

		expect(thumbnail.toString()).toContain("-ss 1");
	});

	it("runs ffmpeg once when the frame is taken from the start", async () => {
		const stubPath = await buildStub(`
			const args = process.argv.slice(2);
			process.stdout.write(args[args.indexOf("-ss") + 1]);
		`);

		const thumbnail = await generateThumbnail(
			{ sourcePath: "/any/source.png", seekSeconds: 0 },
			{ ffmpegPath: stubPath },
		);

		expect(thumbnail).toEqual(Buffer.from("0"));
	});

	// How ffmpeg behaves when the seek lands past the end: it writes nothing and still exits 0
	it("takes the frame from the start when the seek position holds none", async () => {
		const stubPath = await buildStub(`
			const args = process.argv.slice(2);
			if (args[args.indexOf("-ss") + 1] !== "0") {
				process.exit(0);
			}
			process.stdout.write("webp-bytes");
		`);

		const thumbnail = await generateThumbnail(
			{ sourcePath: "/any/source.mp4", seekSeconds: 1 },
			{ ffmpegPath: stubPath },
		);

		expect(thumbnail).toEqual(Buffer.from("webp-bytes"));
	});

	it("fails when no position yields a frame", async () => {
		const stubPath = await buildStub("process.exit(0);");

		await expect(
			generateThumbnail(
				{ sourcePath: "/any/source.mp4", seekSeconds: 1 },
				{ ffmpegPath: stubPath },
			),
		).rejects.toThrow(/フレームを取得できませんでした/);
	});

	it("fails once ffmpeg runs past the timeout", async () => {
		const stubPath = await buildStub("setTimeout(() => {}, 10_000);");

		await expect(
			generateThumbnail(
				{ sourcePath: "/any/source.mp4", seekSeconds: 1 },
				{ ffmpegPath: stubPath, timeoutMs: 100 },
			),
		).rejects.toThrow(/タイムアウトしました: 100ms/);
	});
});

describe.skipIf(!hasFfmpeg)("generateThumbnail against the real ffmpeg", () => {
	let workDir: string;

	beforeAll(async () => {
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

	// probeMedia reads a path, so the returned bytes are put back on disk to be inspected
	const probeThumbnail = async (thumbnail: Buffer, name: string) => {
		const path = join(workDir, name);
		await writeFile(path, thumbnail);

		return probeMedia(path, { ffprobePath });
	};

	it("makes a 320-wide webp from an image", async () => {
		const thumbnail = await generateThumbnail(
			{ sourcePath: await buildImage(), seekSeconds: 0 },
			{ ffmpegPath },
		);

		const probe = await probeThumbnail(thumbnail, "image.webp");
		expect(probe.width).toBe(320);
		expect(probe.height).toBe(180);
	});

	it("makes a 320-wide webp from a video", async () => {
		const thumbnail = await generateThumbnail(
			{ sourcePath: await buildVideo(), seekSeconds: 1 },
			{ ffmpegPath },
		);

		const probe = await probeThumbnail(thumbnail, "video.webp");
		expect(probe.width).toBe(320);
		expect(probe.height).toBe(180);
	});
});
