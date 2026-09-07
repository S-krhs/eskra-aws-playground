---
name: windows-playground
description: Rules for the windows-playground app — tools launched from Windows Explorer via wsl.exe. Touch this when editing apps/windows-playground/**.
---

Tools launched from Windows Explorer through `wsl.exe`. User-facing docs: `apps/windows-playground/README.md`. Setup: `docs/media-library-uploader.md`.

- Nothing gets installed on the Windows side, ever — no Windows-only binaries, no bundled Node. Execution stays inside WSL's Node.
- Arguments arrive as Windows paths (`C:\...`). Convert to a WSL path before any read/write.
- SendTo splits a large selection across multiple launches (~32KB command-line limit per launch). A single launch is a subset — don't write logic assuming you see the whole selection.
- The uploader only writes to R2, never to the DB. UUID and original filename go into object metadata; the DB gets updated later by the sync batch.
- Key and metadata conventions come from `shared-domains`'s `media-object-key` / `media-object-metadata` — don't reconstruct them here.
- Windows creation time isn't readable from WSL's `stat` (`birthtime` reads as epoch 0). Use mtime; if creation time is genuinely needed, that means going through `powershell.exe`.
- Never put a config file's contents in a log or error. A validation failure names only the field and the file path.
- The config file's location comes from `shared-domains`'s `media-library-config` — `media-library` reads the same file, so don't rebuild the path here. Each app still validates only the fields it needs.
- One file's failure doesn't stop the run. Report per-file, and reflect the failure count in the exit code at the end.
