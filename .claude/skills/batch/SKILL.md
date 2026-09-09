---
name: batch
description: How a background job app is built here — handler/job/feature layering, dispatch by job name, event validation, per-record failure isolation. Invoke this whenever adding or editing a Lambda triggered by a schedule, a queue, or an alarm, in an existing app or a new one.
---

Covers any app whose entry point is a Lambda invoked by EventBridge Scheduler, SQS, or SNS.

## Layering

Entry point → orchestration → logic, always in that direction:

```text
handlers/    entry point. Validates the event, dispatches, shapes the response.
  contracts/ job names and message schemas this handler tree routes on
jobs/        orchestration: ordering repository, integration, and feature calls
features/    the actual logic, one concern per directory
_shared/     app-wide schemas and intermediate models
```

Two layouts are in use, and the split is whether a handler owns anything beyond its entry file. A handler with its own jobs, contracts or startup config nests them under itself (`handlers/<trigger>/handler.ts`, `handlers/<trigger>/jobs/`); handlers that are each a single file sit flat in `handlers/`, with `jobs/` at `src/` level. Follow whichever the app already does, and don't mix them — an entry point in a directory of its own with its jobs somewhere else is neither.

- One handler per **trigger**, never one per job. A job is an entry in a dispatch map, not a new entry point.
- **A job whose timeout or layer needs don't fit the shared config gets its own Lambda Function, not its own handler.** Add a Function in `infra/sst.config.ts` pointing at the existing handler and deliver the job through a cron event or a queue.
- Don't import across handler trees. Shared logic goes to `features/`, `shared-domains` (cross-app contracts and domain data), or `packages/*`.
- Combining features, or ordering repository and integration calls, belongs in a job. Don't create a feature that's only a passthrough to a repository call.
- **Logic only one job uses stays in that job's file, constants included.** `features/` is for what more than one job shares. Splitting a single job across feature files buys nothing and costs the reader the order things happen in — they have to open five files to find out what the job does. A long job file is easier to follow than a scattered one.
- **Write it inline, in the order it happens.** Don't lift a classification or a guard out into a named function at the top of the file just so a test can reach it — that hides the flow for the reader, who is the one paying. A job reads as its numbered steps; a named function earns its place only when the same job calls it more than once.
- **Per-object work that mutates an external system belongs in its own queue job, not in the loop that decided it.** The deciding job classifies and enqueues; the worker does the one object and gets retry, a DLQ and per-record isolation from the platform. Doing it inline means hand-rolling all three, usually as a swallowed error and a hope that the next run retries.
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

- Name it after what it does, not after its trigger or its schedule.
- Register the name in that handler tree's `contracts/`, then in the handler's dispatch map.
- Queue-triggered: add the message schema to the worker's schema union and its dispatch. If a different app produces the message, the name and schema live in that domain's slice under `shared-domains/` so both sides share one definition.
- Update the app README's job list and env vars.

## Rules

- Take the launch event as `unknown` and validate/normalize it through the handler's `schema.ts` before a job sees it. Data from a repository is validated at that boundary and treated as a typed value inside the app.
- A queue message carries an identifier, not the payload body — the worker re-reads the definition from its repository.
- Match each handler's response to a response type declared for that handler, so the caller can handle it mechanically.
- A queue worker isolates failure per record; only failed messages go into `batchItemFailures`. Per-record execution control lives in the job — the handler only delegates.
- SQS queues are Standard: no ordering guarantee, retry and DLQ handling left to AWS.
- Read a linked secret as `Resource.<name>.value` with its type declared in `sst-resource-links.d.ts`; read an env var as `process.env.<NAME>`.
- A message carrying a token or credential stays out of logs and `details`.
- Keep `details` and start/end logs to safe, debugging-relevant values. Distinguish config-missing / bad-input / external-API-failure by the error message.
- Leave one line of orchestration comment per processing section.

A job's own implementation detail — what it does, its algorithm, its gotchas — lives in that job's and its features' file headers and comments, not here.
