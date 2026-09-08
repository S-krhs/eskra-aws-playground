---
name: rule-compliance
description: How a change is checked against this repo's own rules — CLAUDE.md, .claude/rules/, and the skill covering the kind of code that changed. Invoke this after implementing anything, to report rule violations without fixing them.
---

Rule compliance only. Bugs, performance, and simplification belong to `/code-review` — don't report them here, and don't fix what you find: this produces a list of violations, nothing else.

## Read first

1. `git status --porcelain` and `git diff HEAD` for the diff under review. Pick up new files with `git ls-files --others --exclude-standard` and read them in full.
2. `CLAUDE.md`, `.claude/rules/coding.md`, `.claude/rules/architecture.md`.
3. The kind each changed workspace belongs to, from the "Which skill covers which workspace" table in `architecture.md`. Invoke that skill and read it. A diff spanning two kinds needs both.
4. Two or three existing files doing the same kind of thing, in the same layer and package as each changed file. That's the standard the diff has to match — how config is read, what is returned, how things are named and organized.

## Check

- File header: every implementation file starts with `// In scope:` / `// Out of scope:`. `In scope` covers one concern, and names the same responsibility as the filename.
- Dependency direction, per `architecture.md`. Feature-to-feature imports, `packages/libs/*` reaching upward, `shared-domains` reaching into an integration.
- Placement. Target-specific wire concerns vs target-agnostic conventions; domain-specific code sitting under `packages/`; an integration owning URL/token resolution, job decisions, or app-specific types.
- Barrel files. No `index.ts` outside an FSD slice's public API.
- `.js` extension on relative ESM imports.
- Comments and doc-comments: nothing that restates the code, nothing the name and types already say, density matching the surrounding file.
- Logs and error messages in Japanese, and natural Japanese — no translationese, no typos, no subject/predicate mismatch. Rules, skills, and code comments in English.
- No secrets, webhook URLs, or over-detailed bodies in logs or responses.
- A new npm dependency: whether an existing dep or standard API covers it, and whether it landed in the right `package.json`.
- Whatever the covering skill requires — layering, where validation happens, failure isolation.
- Whether a rule or skill itself needs updating because of this change.

Where existing code and a rule disagree, existing code wins: report the mismatch rather than treating the code as the violation.

## Report

Only real violations, heaviest first. Per finding:

- `file:line`
- The rule broken, and which file states it
- What specifically diverges
- The fix, with the path of an existing file that already does it right

If nothing violates a rule, say exactly that. Don't pad the list with preferences or with anything the rules don't state.
