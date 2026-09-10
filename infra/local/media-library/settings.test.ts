import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

const settings: unknown = JSON.parse(
	readFileSync(new URL("settings.json", `file://${currentDir}`), "utf8"),
);

const settingsSchema = settings as {
	configEnv: string;
	configPath: string;
	serviceName: string;
	port: number;
	bucketName: string;
	targets: Record<string, string>;
};

const sstConfigSource = readFileSync(
	new URL("../../sst.config.ts", `file://${currentDir}`),
	"utf8",
);

describe("media library local run settings", () => {
	// run.mjs and build-launchers.mjs both join this onto the home directory, so an absolute
	// value here would silently escape it
	it("keeps the config path relative to the home directory", () => {
		expect(settingsSchema.configPath).toBe(
			".config/eskra-media-library/config.json",
		);
	});

	// run.mjs joins these onto the repository root
	it("names each target as a repository-relative built entry point", () => {
		for (const target of Object.values(settingsSchema.targets)) {
			expect(target).toMatch(/^apps\/.+\/dist\/.+\.js$/);
		}
	});

	// The user copies the generated template into place by hand, so a bucket name that drifted from
	// the deploy would only surface as an empty library much later
	it("matches the bucket name sst.config.ts deploys for develop", () => {
		const developBucketName = sstConfigSource.match(
			/const mediaBucketName =\s*\$app\.stage === "develop"\s*\? "(.+?)"/,
		)?.[1];

		expect(developBucketName).toBe(settingsSchema.bucketName);
	});
});
