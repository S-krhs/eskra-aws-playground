# Eskra AWS Playground

TypeScript monorepo (npm workspaces + Turbo) running AWS Lambda batch jobs with SST.

## Before writing or changing code

Find 2-3 existing files doing the same kind of thing (same layer, same app, same package) and match their shape exactly: how they read config, how they return values, how they're named, how they're organized. Don't invent a new pattern when one already exists nearby — copy it. If existing code and a rule/skill disagree, prefer existing code and flag the mismatch instead of silently picking one.

`.claude/rules/coding.md` and `.claude/rules/architecture.md` are always loaded and cover the whole repo. A per-workspace Skill may exist for the area you're touching (`.claude/skills/`) — check the skill listing and invoke one if it matches. Skills are not auto-loaded by path; unlike the two always-on rule files above, you have to actively decide to use one.

## Verify

- After any change, run at least `npm run typecheck`.
- If you touched imports, formatting, or dead code, also run `npm run lint`.
- Before a release, or after touching multiple files, run `npm run validate` (typecheck + lint + test).
- Before sending anything to a real webhook, state the destination and the env vars involved first.

## Conventions

- Logs, error messages, and docs (`docs/`, `README.md` files) are written in Japanese — see `.claude/rules/coding.md` for what to write in code comments instead.
- Commit messages: `type: 日本語要約` (feat / fix / refactor / docs / chore / infra / ci / style / test / perf).
- Don't use `git add -A`; add files explicitly by path.
- Commit immediately after each meaningful phase of work, not at the end of the whole task.
