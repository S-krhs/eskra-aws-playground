# Architecture

TypeScript monorepo (npm workspaces + Turbo) for AWS Lambda apps. Lambda apps live in `apps/`; each external integration gets its own package under `packages/integrations/<target>/`.

## Layout

```text
apps/
  batch-anime-analysis/
  batch-playground/
  function-url-playground/
  media-library/
  static-site-playground/
  windows-playground/
infra/
migration/
repositories/
shared-domains/
  contracts/
  protocols/
packages/
  integrations/
    discord/
    scheduler/
    sqs/
  libs/
    browser/
    media/
    utils/
scripts/
docs/
```

## Workspaces

- `apps/*`: deployable or runnable apps. `media-library` and `windows-playground` are never deployed — they run on the user's WSL.
- `infra/`: SST definitions that deploy the apps.
- `migration/`: Prisma schema and migration history. Not a workspace — used from the root `prisma` CLI via `prisma.config.ts`.
- `repositories/`: data-access boundary shared across apps. Hides static data, DB, and external-storage details, including the clients that reach them. Clients and generated code (`client/`, `generated/`) are excluded from exports and unimportable from apps.
- `shared-domains/`: top-level workspace for contracts, domain data, and protocol logic shared across apps. Same reasoning as `repositories/` — it's domain-specific, so it can't live under the generic `packages/`. `contracts/` holds types/vocabulary/data, `protocols/` holds non-networked logic.
- `packages/integrations/*`: one package per external service. Owns both outbound calls and inbound wire parsing for that target.
- `packages/libs/utils`: generic logic, can take light npm deps (e.g. dayjs).
- `packages/libs/browser`: generic logic needing browser-execution deps (Playwright-core).
- `packages/libs/media`: generic logic needing the ffmpeg / ffprobe binaries a Lambda layer supplies.
- `scripts/`: CI helper scripts, not a workspace.

`packages/` is for generic, redistributable code only (integrations, libs). Anything domain-specific goes to `shared-domains/` (or `repositories/` for data access) instead, since it can't be distributed generically.

## Dependency direction

Apps depend down into packages/shared-domains, never the other way.

```text
apps/* -> packages/libs/browser
apps/* -> packages/libs/media
apps/* -> packages/libs/utils
apps/* -> packages/integrations/* -> packages/libs/utils
apps/* -> repositories -> packages/libs/utils
apps/* -> shared-domains -> packages/libs/utils
```

- `repositories` and `shared-domains` never import `apps/*`. They may import `packages/libs/utils`.
- DB client, SQL, and row shapes stay inside the repository package — never leak to an app.
- `packages/libs/*` never imports `apps/*`, `shared-domains`, or `packages/integrations/*`.
- `shared-domains` never imports `apps/*` or `packages/integrations/*`. Target-agnostic conventions (e.g. a custom_id format) belong in `shared-domains`; target-specific wire types/transport/parsing belong in the integration — keep the two independent.
- `packages/integrations/*` never imports `apps/*`, `shared-domains`, or another `packages/integrations/*`.
- Split out a dedicated package for anything needing an external integration or a heavy dependency.

## Feature-to-feature imports

- `apps/<app>/src/features/<feature-a>/` never imports `apps/<app>/src/features/<feature-b>/`.
- Combine features in the app's orchestration layer (e.g. `jobs/`) instead.
- Pure logic reused across features within one app goes to `packages/libs/utils`; business concerns/contracts shared across apps go to `shared-domains`.

## Package policy

- One integration package per target — heavy transport libs and auth SDKs accumulate per target. External storage is the exception: its client and operations belong to `repositories`, which is what hides a data source from an app.
- An integration owns: target-specific types, outbound HTTP/auth, inbound wire parsing/signature verification, error translation for failure responses. It does NOT own: URL/token resolution, target-agnostic convention parsing (e.g. custom_id), job decisions, message generation, or app-specific business types.
- `libs` splits by dependency weight: `packages/libs/utils` (pure, light deps only) vs a package per heavy runtime dependency (`packages/libs/browser`, `packages/libs/media`). An external binary a Lambda layer supplies counts as heavy even when the npm deps are light — importing it without that layer fails at runtime.
- App-specific parsers or domain types don't belong in libs — put them in that app's `features/` (single app) or `shared-domains` (shared across apps).

## Where things are documented

- `.claude/rules/coding.md` and `architecture.md`: always loaded.
- `.claude/skills/`: architecture, layering, and process convention, **one skill per kind of code, never one per app**. A new app is covered by the kind it belongs to instead of falling through with nothing to read. Invoked when relevant, not auto-loaded by path. A skill names no app and no feature: what a specific job/component does — its algorithm, its gotchas, the platform limits it runs into — belongs in that file's own header and comments, so a skill reads the same regardless of what prompted the edit.

## Which skill covers which workspace

| Kind | Skill | Workspaces |
| --- | --- | --- |
| HTTP endpoint | `api` | `apps/function-url-playground`, `apps/media-library/backend` |
| Scheduled or queue-driven Lambda | `batch` | `apps/batch-playground`, `apps/batch-anime-analysis` |
| Browser UI | `frontend` | `apps/static-site-playground`, `apps/media-library/frontend` |
| Runs on the user's WSL, never deployed | `local-tools` | `apps/media-library`, `apps/windows-playground` |
| External-service package | `integrations` | `packages/integrations/*` |
| Generic library | `libs` | `packages/libs/*` |
| Cross-app contract and protocol | — | `shared-domains/` |
| Data access | `repositories` | `repositories/` |
| Schema change | `db-migration` | `migration/`, `repositories/client/` |
| Deployment and CI | `infra-deploy` | `infra/`, `.github/workflows/`, `scripts/` |

`shared-domains/` has no skill of its own: it holds contracts and pure protocol logic, and the rules
that govern it are the always-loaded ones above (placement, dependency direction, no barrel files).

This table is the only place a kind and an app are linked — keep it out of the skills themselves. A workspace spanning two kinds appears twice. A new workspace picks its kind here, then copies the implementations already listed under it.
- `docs/`: human-facing operational commands and procedures (CI/CD, manual setup steps). Japanese, and nothing but the commands/steps — no rationale, no one-time historical records.
- Each workspace's `README.md`: human-facing usage — commands and secrets. Japanese, same rule as `docs/`. A package's own API is documented in the code's doc-comments, not the README.
