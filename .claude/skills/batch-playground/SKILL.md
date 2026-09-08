---
name: batch-playground
description: Rules for batch-playground — Discord/gacha/media-library batch jobs dispatched by job name. Touch this when editing apps/batch-playground/** or repositories/playground/**.
---

Runs batch jobs dispatched by a `job` field on the Lambda event. `infra/sst.config.ts` defines the Lambda + EventBridge Scheduler + the interaction-job SQS queue, and passes `job` in on scheduled invocations.

Only two handlers, split by how they're triggered: `batch` (scheduler) and `sqs-worker` (SQS). Don't add a handler per job.

**A job whose timeout or layer needs don't fit the shared config gets its own Lambda Function, not its own handler.** Add a Function in `infra/sst.config.ts` pointing at the existing handler, and deliver the job via a cron event or a queue (e.g. media sync is a 15-minute Function pointing at the `batch` handler; thumbnail generation is a `sqs-worker`-handler Function carrying the ffmpeg layer).

The public endpoint receiving Discord interactions lives in `function-url-playground`; this app's `sqs-worker` processes its follow-up jobs.

## Interaction follow-up jobs (sqs-worker)

`function-url-playground` deferred-ACKs a Discord interaction within 3 seconds and hands the real work to SQS. `sqs-worker` receives that follow-up, builds the final message, and edits the original using the interaction token.

- Building and sending the final message is the `sqs-worker` job's responsibility. No bot token — resolve where to respond from the message's own `application_id`/`token`.
- Interaction tokens expire in 15 minutes; keep follow-up retries inside that window.
- Job name and message schema are shared with the producer (`function-url-playground`), so they live in `@eskra-aws-playground/shared-domains/contracts` (`interaction-job-names` / `interaction-job-message`).

A job's own implementation detail (what it does, its algorithm, its gotchas) lives in that job's and its features' own file headers and comments, not here — this skill covers dispatch and cross-cutting convention only. Each file's own header states its scope — read it before assuming. Job contracts crossing a handler tree (job name, message schema) and producer-shared conventions (custom_id, prefixes, choice catalog, button tone) live in `@eskra-aws-playground/shared-domains`. Discord parsing/signature-verification/response types/send clients come from `@eskra-aws-playground/integration-discord`.

## Dependency direction

```text
handlers/batch:      handler -> jobs -> features / repositories / integrations
handlers/sqs-worker: handler -> jobs -> features / repositories / integrations
jobs / features -> packages/integrations/*
jobs / features -> packages/libs
jobs / features -> shared-domains
features -> repositories
```

- Don't import across handler trees. Shared logic goes to `src/features/` (feature-level), `shared-domains` (cross-app contracts/domain data), or `packages/*`.
- Combining features, or ordering repository/integration calls, belongs in `jobs/`. Don't create a feature that's just a passthrough to a repository call.

## Rules

- Name a job after what it does (e.g. `uma-one-draw-topic`), add it to `contracts/job-names.ts`, register it in `handler.ts`'s `batchJobs` map.
- Adding an SQS-triggered job: put the message schema in `shared-domains/contracts`, register it in `sqs-worker/schema.ts`'s `sqsJobMessageSchema` union and in `handler.ts`'s dispatch. Non-interaction jobs share the same handler.
- Adding an interaction job: add the job name to `shared-domains/contracts/interaction-job-names.ts`, add a message with only the fields that job needs to `shared-domains/contracts/interaction-job-message.ts`, register the dispatch in `handlers/sqs-worker/handler.ts`. The message carries the interaction token — keep it out of logs and `details`.
- `sqs-worker` isolates failure per record; only the failed messages go into `batchItemFailures` for retry.
- Take the launch event as `unknown`, validate/normalize via `schema.ts`. Match the response shape to `BatchResponse` so callers can handle it mechanically.
- Read a linked secret directly as `Resource.<name>.value` in the handler/job, with the type declared in `sst-resource-links.d.ts`. Read an env var directly as `process.env.<NAME>`.
- Build Discord message payloads in a feature. Tone→style conversion for buttons (`button-styles.ts`) uses `ButtonTone` (shared-domains) and `DiscordButtonComponent` (integration-discord); custom_id generation uses shared-domains' `buildCustomId`.
- Before sharing logic across features, check whether duplication is actually fine. Cross-app contracts/domain data go to `shared-domains` — don't create a within-app `shared/domains` carrying business logic.
- Don't put implementation files directly under `features/` — split by concern. Settings and logic go in separate files (e.g. `topic-settings.ts` vs. `topic-message.ts`).
- Leave one line of orchestration comment per processing section.
- Keep `details` and start/end logs to safe, debugging-relevant values; distinguish config-missing / bad-input / external-API-failure by the error message.
- Adding a job means updating the app README's job list and env vars.
