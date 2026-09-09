---
name: local-tools
description: How an app that runs on the user's WSL instead of AWS is built — never deployed, shared config file, single-instance behavior, Windows-launched entry points. Invoke this whenever adding or editing a local-only tool, in an existing app or a new one.
---

Some apps never deploy — they run on the user's WSL, either as a resident server with a browser UI or as one-shot tools launched from Windows Explorer through `wsl.exe`. Their HTTP and UI layers follow the `api` and `frontend` skills; this covers only what's different because it runs locally.

- **Never deployed.** A local tool doesn't appear in `infra/sst.config.ts` — but how it starts is still infra's, and lives under `infra/`. Heavy or long-running work belongs in a deployed batch app: the local tool asks it to start and reads progress.
- Nothing is ever installed on the Windows side: no Windows-only binaries, no bundled Node. Execution stays inside WSL's Node.
- **Relative imports don't use the `@/` alias in code run directly by `node`.** Nothing resolves `tsconfig`'s `paths` at runtime, unlike an app whose bundler rewrites them. Only bundled code (a Vite frontend, a Lambda bundle) can use the alias.
- **Where config comes from is decided in `infra/` and handed over as an environment variable**, the same way a Lambda gets its settings from `sst.config.ts`. A local tool carries no default path of its own — an unset variable is an error that says so, not a silent fall back to some other file. Each tool validates only the fields it needs.
- **Every launch route goes through the same launcher**, so the config path is decided once rather than repeated per entry point. A generated artifact (a systemd unit, a Windows shortcut) either invokes that launcher or is written from the same settings — see the `infra-deploy` skill.
- **Reading the file is a startup concern, not a module the rest of the app asks.** The entry point reads it once and puts the values where each consumer already looks for them — the environment variables a repository or a client contracts. Nothing downstream then has to know a config file exists.
- **Never put a config file's contents in a log or an error.** A validation failure names the field and the file path, nothing else.
- Bind a server to `127.0.0.1` only. Don't open it to other devices without an explicit decision to.
- If the port is already taken, assume another instance is running and exit 0. A resident restart must never end up running two instances.
- External storage: the object metadata a tool attaches comes from `shared-domains`, and where an object lands is `repositories`' call — the tool names the area it means and never assembles a key. Don't rebuild either convention in the tool.
- `repositories` reads its connection from `DATABASE_URL`, and there's no Lambda environment to supply it — set it at startup before any route or command runs.

## Launched from Windows

- Arguments arrive as Windows paths (`C:\...`). Convert to a WSL path before any read or write.
- SendTo splits a large selection across multiple launches (~32KB command-line limit per launch). One launch sees a subset — never write logic assuming it sees the whole selection.
- Windows creation time isn't readable through WSL's `stat` (`birthtime` reads as epoch 0). Use mtime; genuinely needing creation time means going through `powershell.exe`.
- One file's failure doesn't stop the run. Report per file, and reflect the failure count in the exit code at the end.
