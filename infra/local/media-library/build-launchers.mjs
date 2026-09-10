// In scope: writing the launch artifacts for the WSL-local tools from the settings they all share
// Out of scope: launching a tool, building the tools, the values the user has to fill in himself

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repositoryRootDir = resolve(toolDir, "../../..");
const temporaryRootDir = resolve(repositoryRootDir, ".tmp");
const outputDir = resolve(temporaryRootDir, "local");

if (!outputDir.startsWith(`${temporaryRootDir}/`)) {
	throw new Error(`Refusing to remove a path outside .tmp: ${outputDir}`);
}

const settings = JSON.parse(
	readFileSync(resolve(toolDir, "settings.json"), "utf8"),
);

const configPath = resolve(homedir(), settings.configPath);
const launcherPath = resolve(toolDir, "run.mjs");

// Only readable from inside WSL, which is the only place these artifacts are ever generated
const distroName = process.env.WSL_DISTRO_NAME;

if (!distroName) {
	throw new Error("WSL_DISTRO_NAME が読めません。WSL の中で実行してください");
}

// systemd takes the config path as an environment entry rather than going through run.mjs, so the
// resident process is the server itself and Restart= acts on it instead of on a wrapper
const serviceUnit = `[Unit]
Description=Eskra media library
After=default.target

[Service]
Type=simple
WorkingDirectory=${repositoryRootDir}
Environment=${settings.configEnv}=${configPath}
ExecStart=/usr/bin/env node ${settings.targets.library}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`;

// A SendTo shortcut has nowhere to put an environment entry, so this one goes through run.mjs.
// -e (--exec) rather than --: with --, wsl.exe joins the trailing arguments and hands them to
// /bin/bash -c, and the shell eats the backslashes in the Windows path Explorer appends, leaving
// E:Picturesa.jpg. -e execs directly, so the path arrives whole
const sendToCommand = `C:\\Windows\\System32\\wsl.exe -d ${distroName} -e node ${launcherPath} upload
`;

const configTemplate = `${JSON.stringify(
	{
		bucket: settings.bucketName,
		r2: { accountId: "", accessKeyId: "", secretAccessKey: "" },
		databaseUrl: "",
		syncEndpointUrl: "",
		syncToken: "",
		port: settings.port,
	},
	null,
	"\t",
)}\n`;

rmSync(outputDir, { force: true, recursive: true });
mkdirSync(outputDir, { recursive: true });

writeFileSync(
	resolve(outputDir, `${settings.serviceName}.service`),
	serviceUnit,
	"utf8",
);
writeFileSync(resolve(outputDir, "sendto-command.txt"), sendToCommand, "utf8");
writeFileSync(
	resolve(outputDir, "config.template.json"),
	configTemplate,
	"utf8",
);

console.log(`[local] 起動成果物を書き出しました: ${outputDir}`);
console.log(`[local] 設定ファイルの置き場所: ${configPath}`);
