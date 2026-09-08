---
name: batch
description: How a background job app is built here — handler/job/feature layering, dispatch by job name, event validation, per-record failure isolation. Invoke this whenever adding or editing a Lambda triggered by a schedule, a queue, or an alarm, in an existing app or a new one.
---

Covers any app whose entry point is a Lambda invoked by EventBridge Scheduler, SQS, or SNS. Two exist today and a new one copies whichever is closer rather than inventing a layout: `apps/batch-playground` (one handler per trigger, many jobs dispatched by name) and `apps/batch-anime-analysis` (one single-purpose handler per Lambda: orchestrator → queue → worker, plus an alarm notifier and a scheduled export).

## Layering

Entry point → orchestration → logic, always in that direction:

```text
handlers/    entry point. Validates the event, dispatches, shapes the response.
  contracts/ job names and message schemas this handler tree routes on
jobs/        orchestration: ordering repository, integration, and feature calls
features/    the actual logic, one concern per directory
shared/      app-wide schemas and intermediate models
```

`jobs/` and `contracts/` nest under a handler directory when that handler dispatches several jobs by name (`handlers/batch/jobs/`); they sit at `src/` level when each handler is a single-purpose Lambda. Pick whichever the app already does.

- One handler per **trigger**, never one per job. A job is an entry in a dispatch map, not a new entry point.
- **A job whose timeout or layer needs don't fit the shared config gets its own Lambda Function, not its own handler.** Add a Function in `infra/sst.config.ts` pointing at the existing handler and deliver the job through a cron event or a queue.
- Don't import across handler trees. Shared logic goes to `features/`, `shared-domains` (cross-app contracts and domain data), or `packages/*`.
- Combining features, or ordering repository and integration calls, belongs in a job. Don't create a feature that's only a passthrough to a repository call.
- Don't put implementation files directly under `features/<feature>/` — split by concern (settings vs. message building, and so on).
- Before sharing logic across features, check whether the duplication is actually fine. Cross-app contracts and domain data go to `shared-domains`; don't grow a within-app `shared/domains` holding business logic.
- Converting a repository's shape into a feature's input happens in a job; a feature receives the converted input and doesn't depend on the repository's shape.

## Dependency direction

```text
handler -> jobs -> features / repositories / packages/integrations/*
jobs / features -> packages/libs
jobs / features -> shared-domains
features -> repositories
```

## Adding a job

- Name it after what it does (`uma-one-draw-topic`, `anime-scraping-data-source`).
- Register the name in that handler tree's `contracts/`, then in the handler's dispatch map.
- Queue-triggered: add the message schema to the worker's schema union and its dispatch. If a different app produces the message, the name and schema live in `shared-domains/contracts` so both sides share one definition.
- Update the app README's job list and env vars.

## Rules

- Take the launch event as `unknown` and validate/normalize it through the handler's `schema.ts` before a job sees it. Data from a repository is validated at that boundary and treated as a typed value inside the app.
- A queue message carries an identifier, not the payload body — the worker re-reads the definition from its repository.
- Match each handler's response to its own response type (`BatchResponse`, `OrchestratorResponse`) so the caller can handle it mechanically.
- A queue worker isolates failure per record; only failed messages go into `batchItemFailures`. Per-record execution control lives in the job — the handler only delegates.
- SQS queues are Standard: no ordering guarantee, retry and DLQ handling left to AWS.
- Read a linked secret as `Resource.<name>.value` with its type declared in `sst-resource-links.d.ts`; read an env var as `process.env.<NAME>`.
- A message carrying a token or credential stays out of logs and `details`.
- Keep `details` and start/end logs to safe, debugging-relevant values. Distinguish config-missing / bad-input / external-API-failure by the error message.
- Leave one line of orchestration comment per processing section.

A job's own implementation detail — what it does, its algorithm, its gotchas — lives in that job's and its features' file headers and comments, not here.
