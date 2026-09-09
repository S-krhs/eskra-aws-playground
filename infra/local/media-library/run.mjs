// In scope: launching one WSL-local tool with the config file's location placed in its environment
// Out of scope: reading the config file, building the tools, what each tool then does

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repositoryRootDir = resolve(toolDir, "../../..");

const settings = JSON.parse(
	readFileSync(resolve(toolDir, "settings.json"), "utf8"),
);

const [targetName, ...targetArgs] = process.argv.slice(2);
const targetPath = settings.targets[targetName];

if (!targetPath) {
	const known = Object.keys(settings.targets).join(" / ");

	console.error(
		`起動対象が不正です: ${targetName ?? "(指定なし)"}。${known} のいずれかを指定してください`,
	);
	process.exit(1);
}

// The tools carry no default path of their own, so every launch route has to set this here
const result = spawnSync(
	"node",
	[resolve(repositoryRootDir, targetPath), ...targetArgs],
	{
		stdio: "inherit",
		env: {
			...process.env,
			[settings.configEnv]:
				process.env[settings.configEnv] ??
				resolve(homedir(), settings.configPath),
		},
	},
);

if (result.error) {
	console.error(`起動に失敗しました: ${targetName}`, result.error);
	process.exit(1);
}

// The tools use the exit code to report their own outcome, so it is passed straight through
process.exit(result.status ?? 1);
