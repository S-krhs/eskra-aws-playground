import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const layerSourceDir = dirname(fileURLToPath(import.meta.url));
const repositoryRootDir = resolve(layerSourceDir, "../../..");
const temporaryRootDir = resolve(repositoryRootDir, ".tmp");
const outputRootDir = resolve(temporaryRootDir, "layers/browser-runtime");
const outputNodejsDir = resolve(outputRootDir, "nodejs");

if (!outputRootDir.startsWith(`${temporaryRootDir}/`)) {
	throw new Error(`Refusing to remove a path outside .tmp: ${outputRootDir}`);
}

rmSync(outputRootDir, {
	force: true,
	recursive: true,
});
mkdirSync(outputNodejsDir, { recursive: true });

for (const fileName of ["package.json", "package-lock.json"]) {
	cpSync(
		resolve(layerSourceDir, "nodejs", fileName),
		resolve(outputNodejsDir, fileName),
	);
}

execFileSync("npm", ["ci", "--omit=dev", "--ignore-scripts"], {
	cwd: outputNodejsDir,
	stdio: "inherit",
});
