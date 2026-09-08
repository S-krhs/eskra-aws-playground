---
name: local-tools
description: How an app that runs on the user's WSL instead of AWS is built — never deployed, shared config file, single-instance behavior, Windows-launched entry points. Invoke this whenever adding or editing a local-only tool, in an existing app or a new one.
---

Some apps never deploy — they run on the user's WSL, either as a resident server with a browser UI or as one-shot tools launched from Windows Explorer through `wsl.exe`. Their HTTP and UI layers follow the `api` and `frontend` skills; this covers only what's different because it runs locally.

- **Never deployed.** A local tool doesn't appear in `infra/sst.config.ts`. Heavy or long-running work belongs in a deployed batch app — the local tool asks it to start and reads progress.
- Nothing is ever installed on the Windows side: no Windows-only binaries, no bundled Node. Execution stays inside WSL's Node.
- **Relative imports don't use the `@/` alias in code run directly by `node`.** Nothing resolves `tsconfig`'s `paths` at runtime, unlike an app whose bundler rewrites them. Only bundled code (a Vite frontend, a Lambda bundle) can use the alias.
- Config comes from a file under `~/.config/`, and its location is decided once in `shared-domains` so every tool reading it agrees. Each tool validates only the fields it needs.
- **Never put a config file's contents in a log or an error.** A validation failure names the field and the file path, nothing else.
- Bind a server to `127.0.0.1` only. Don't open it to other devices without an explicit decision to.
- If the port is already taken, assume another instance is running and exit 0. A resident restart must never end up running two instances.
- Key and metadata conventions for external storage come from `shared-domains` — don't rebuild them in the tool.
- `repositories` reads its connection from `DATABASE_URL`, and there's no Lambda environment to supply it — set it at startup before any route or command runs.

## Launched from Windows

- Arguments arrive as Windows paths (`C:\...`). Convert to a WSL path before any read or write.
- SendTo splits a large selection across multiple launches (~32KB command-line limit per launch). One launch sees a subset — never write logic assuming it sees the whole selection.
- Windows creation time isn't readable through WSL's `stat` (`birthtime` reads as epoch 0). Use mtime; genuinely needing creation time means going through `powershell.exe`.
- One file's failure doesn't stop the run. Report per file, and reflect the failure count in the exit code at the end.
