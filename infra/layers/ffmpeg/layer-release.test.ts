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

describe("ffmpeg layer の取得元", () => {
	// 取得元を ffmpeg-release-amd64-static.tar.xz のような移動する URL に差し替えると、
	// deploy のたびに別バージョンが混入する。version を含む固定 URL であることを検証する。
	it("version を含む固定 URL を指す", () => {
		expect(releaseSchema.url).toContain(
			`ffmpeg-${releaseSchema.version}-amd64-static.tar.xz`,
		);
	});

	it("sha256 を 64 桁の hex で固定する", () => {
		expect(releaseSchema.sha256).toMatch(/^[0-9a-f]{64}$/);
	});

	// build.mjs が archive 内の path を組み立てるため、対象は名前だけで指定する
	it("取り出す binary を名前だけで指定する", () => {
		expect(releaseSchema.binaries).toEqual(["ffmpeg", "ffprobe"]);
	});
});
