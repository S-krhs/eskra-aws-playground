import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

const readDependencies = (packageJsonPath: string): Record<string, string> => {
	const packageJson: unknown = JSON.parse(
		readFileSync(packageJsonPath, "utf8"),
	);

	if (
		typeof packageJson !== "object" ||
		packageJson === null ||
		!("dependencies" in packageJson)
	) {
		throw new Error(`dependencies がありません: ${packageJsonPath}`);
	}

	return (packageJson as { dependencies: Record<string, string> }).dependencies;
};

describe("browser-runtime layer の依存", () => {
	// layer は esbuild external で bundle されないため、バージョンがずれると
	// 型検査は通るのに Lambda 実行時に初めて壊れる。両者の一致を検証する。
	it("packages/libs/browser と同じ依存バージョンを固定する", () => {
		const layerDependencies = readDependencies(
			resolve(currentDir, "nodejs/package.json"),
		);
		const libsBrowserDependencies = readDependencies(
			resolve(currentDir, "../../../packages/libs/browser/package.json"),
		);

		expect(layerDependencies).toEqual(libsBrowserDependencies);
	});
});
