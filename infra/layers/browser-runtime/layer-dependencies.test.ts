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

describe("browser-runtime layer dependencies", () => {
	// The layer is esbuild-external and never bundled, so a version drift passes typecheck
	// and only breaks at Lambda runtime. Check that the two stay in step.
	it("pins the same dependency versions as packages/libs/browser", () => {
		const layerDependencies = readDependencies(
			resolve(currentDir, "nodejs/package.json"),
		);
		const libsBrowserDependencies = readDependencies(
			resolve(currentDir, "../../../packages/libs/browser/package.json"),
		);

		expect(layerDependencies).toEqual(libsBrowserDependencies);
	});
});
