import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

const release: unknown = JSON.parse(
	readFileSync(new URL("ffmpeg-release.json", `file://${currentDir}`), "utf8"),
);

const releaseSchema = release as {
	version: string;
	url: string;
	sha256: string;
	binaries: string[];
};

describe("ffmpeg layer source", () => {
	// Pointing at a moving URL like ffmpeg-release-amd64-static.tar.xz would pull a different
	// version into every deploy. Check that the URL is pinned and carries the version.
	it("points at a pinned URL carrying the version", () => {
		expect(releaseSchema.url).toContain(
			`ffmpeg-${releaseSchema.version}-amd64-static.tar.xz`,
		);
	});

	it("pins the sha256 as 64 hex digits", () => {
		expect(releaseSchema.sha256).toMatch(/^[0-9a-f]{64}$/);
	});

	// build.mjs assembles the path inside the archive, so targets are named alone
	it("names the binaries to extract without a path", () => {
		expect(releaseSchema.binaries).toEqual(["ffmpeg", "ffprobe"]);
	});
});
