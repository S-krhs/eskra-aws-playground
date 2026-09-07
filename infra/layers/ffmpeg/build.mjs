// In scope: 固定版の ffmpeg static build を取得し、Lambda Layer の bin/ を組み立てる
// Out of scope: LayerVersion リソースの定義、layer を利用する Lambda function の構成

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const layerSourceDir = dirname(fileURLToPath(import.meta.url));
const repositoryRootDir = resolve(layerSourceDir, "../../..");
const temporaryRootDir = resolve(repositoryRootDir, ".tmp");
const outputRootDir = resolve(temporaryRootDir, "layers/ffmpeg");
const outputBinDir = resolve(outputRootDir, "bin");
const downloadDir = resolve(temporaryRootDir, "layers/ffmpeg-download");

if (!outputRootDir.startsWith(`${temporaryRootDir}/`)) {
	throw new Error(`Refusing to remove a path outside .tmp: ${outputRootDir}`);
}

const release = JSON.parse(
	readFileSync(resolve(layerSourceDir, "ffmpeg-release.json"), "utf8"),
);

const archiveRootDir = `ffmpeg-${release.version}-amd64-static`;
const archivePath = resolve(downloadDir, `${archiveRootDir}.tar.xz`);

const digestOf = (filePath) => {
	return createHash("sha256").update(readFileSync(filePath)).digest("hex");
};

mkdirSync(downloadDir, { recursive: true });

// 配布物は 40MB を超えるため、checksum が一致する取得済み archive は再利用する
if (!existsSync(archivePath) || digestOf(archivePath) !== release.sha256) {
	const response = await fetch(release.url);

	if (!response.ok) {
		throw new Error(
			`ffmpeg の取得に失敗しました(${response.status}): ${release.url}`,
		);
	}

	writeFileSync(archivePath, Buffer.from(await response.arrayBuffer()));

	const downloadedDigest = digestOf(archivePath);

	if (downloadedDigest !== release.sha256) {
		rmSync(archivePath, { force: true });
		throw new Error(
			`ffmpeg の checksum が一致しません。期待値 ${release.sha256}、実際 ${downloadedDigest}`,
		);
	}
}

rmSync(outputRootDir, {
	force: true,
	recursive: true,
});
mkdirSync(outputBinDir, { recursive: true });

execFileSync(
	"tar",
	[
		"-xJf",
		archivePath,
		"-C",
		outputBinDir,
		"--strip-components=1",
		...release.binaries.map((binaryName) => {
			return `${archiveRootDir}/${binaryName}`;
		}),
	],
	{ stdio: "inherit" },
);

// Lambda は /opt/bin を PATH に含めるが、実行権限は archive から引き継がれないことがある
for (const binaryName of release.binaries) {
	chmodSync(resolve(outputBinDir, binaryName), 0o755);
}
