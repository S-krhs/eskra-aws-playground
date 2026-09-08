---
name: infra-deploy
description: How this repo deploys and what constrains it — SST config, GitHub Actions workflows, CI scripts, and secret handling. Invoke this when editing infra/**, .github/workflows/**, or scripts/**, or when giving a new app a Lambda, queue, or schedule.
---

Human-facing ops runbook and manual-setup records: `docs/ci-cd.md`.

## What `infra/sst.config.ts` manages

Lambda functions, EventBridge Scheduler, SQS queues/DLQs, the SNS topic + CloudWatch alarms for failure detection (DLQ backlog, orchestrator errors, BigQuery export errors), the browser-runtime Lambda layer and its S3 asset bucket, the IAM resources those need, and the static-site CloudFront/S3/ACM/Route53 setup (`StaticSitePlayground`). Per-job scheduler payloads and secrets are documented in that app's README, not here.

## Constraints that aren't obvious from the code

- `sst.config.ts` depends on types SST generates under `.sst/platform`, which don't exist in CI — so typecheck is scoped to `infra/config/` (settings) and `infra/layers/` (layer-definition tests) via `infra/tsconfig.json`'s `include`. Lint still covers `sst.config.ts`.
- `develop` stage is CD-only, protected two ways: a guard at the top of `run()` rejects every `run()`-evaluating command (`deploy`/`dev`/`refresh`) except `diff` (checked via `GITHUB_ACTIONS` env first, then SST's internal `$cli.command` — env check has to come first to keep `$cli` out of the CD path), and `app()`'s `protect` rejects `sst remove`, which doesn't evaluate `run()`. Neither `sst secret set` nor `sst secret list` goes through either guard, so `develop` secrets are set from CD only — never run those locally against `--stage develop`.
- Scheduled Scheduler crons aren't created under `sst dev` — that's meant for local iteration, and a stray cron left firing after the dev session ends would be bad.
- Secrets have exactly one source: the stage's SST secret. CD writes it as `SST_SECRET_*` env during deploy; runtime code reads it via `sst shell` (scripts) or `Resource` (Lambda). Never pass a secret as a plain env var. An ops script needing a stage's secrets lives in that app's `src/scripts/` and runs under `sst shell`, never from a Lambda.
- The browser-runtime layer archive goes through a versioned `sst-asset-*` S3 bucket before publish, to avoid Lambda's direct-upload size limit.
- An Actions-invoked operational Lambda gets an explicit `name: "${appName}-${$app.stage}-<purpose>"` on `sst.aws.Function` — the generated name can't be referenced, and renaming means recreating the function.
- Manual-run ops workflows are `workflow_dispatch`, with the actual logic in a `scripts/` Node script. Break external-write operations into idempotent chunks and have failures print where to resume from.
- GCP resources (project/dataset/service account) are outside SST's management — manual setup gets recorded in `docs/ci-cd.md` and the relevant app's README. Stage-varying values (dataset name) are decided in `sst.config.ts` and passed to Lambda as env.

## Before you're done

- Node.js version in the workflow vs. the Lambda runtime — intentional?
- Workflow default permissions read-only, `id-token: write` only on the job assuming the AWS role?
- Any `uses:` action targeting a deprecated Node.js runtime?
- New required env var → updated the GitHub Secrets list in `docs/ci-cd.md` and the app's README?
- Destructive migration → noted in the PR body?
- `DIRECT_DATABASE_URL` not leaking past the migration step?
- Scheduler event payload matches the target app's job-routing name and carries no secret values?
- An ops workflow's Lambda name matches `sst.config.ts`'s `name`?
- `npm run validate` passes?
- `npx sst diff --stage develop --config infra/sst.config.ts` shows no surprise diff?
