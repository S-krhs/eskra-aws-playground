---
name: batch-anime-analysis
description: Rules for batch-anime-analysis — scraping, notifications, and BigQuery export for anime metrics. Touch this when editing apps/batch-anime-analysis/** or repositories/anime/**.
---

Runs the anime-scraping definitions from `repositories`, notifies Discord Webhook with results. An orchestrator Lambda enqueues one SQS message per data source; a worker Lambda processes them. A notifier Lambda, triggered by CloudWatch alarm via SNS, handles batch-failure notification. A schedule-triggered Lambda exports accumulated metrics to BigQuery daily.

Each file's own header states its scope — read it before assuming.

## Dependency direction

```text
orchestrator -> jobs -> packages/integrations/sqs
sqs-worker -> jobs
alarm-notifier -> jobs
bigquery-export -> jobs -> packages/integrations/bigquery
features -> packages/libs/browser
jobs -> packages/integrations/*
jobs -> repositories/anime -> DB
```

## Rules

- Name a job after what it does (e.g. `anime-scraping-data-source`). Run-level orchestration goes in `jobs/`, feature-level logic in `features/`.
- Take the launch event as `unknown`; validate/normalize with a schema right before a job uses it. Data coming from a repository gets validated at that repository boundary, then treated as a camelCase type inside the app.
- Match each Lambda's response to its handler-specific response type (e.g. `OrchestratorResponse`) so callers can handle it mechanically.
- Static scraping-target definitions live in `repositories/anime/data.ts`; the SQS event never carries the definition body itself.
- Converting a repository scraping definition into a metric-parser input happens in `jobs/`; a feature receives the already-converted input and doesn't depend on the repository's definition shape.
- SQS is Standard (no ordering guarantee); retry/DLQ handling is left to AWS. SQS message body construction/validation is centralized in `src/shared/schemas/sqs/data-source/message.ts`; sending goes through `@eskra-aws-playground/integration-sqs`.
- Per-record execution control and partial-batch response live in the data-source scraping job; the worker handler only delegates.
- Alert notification text lives in `src/features/notifications/alarm-report.ts`; assembling the send is `src/jobs/alarm-notification.ts`.
- Leave one line of orchestration comment per processing section.
- Keep `details` and logs to safe, debugging-relevant info; distinguish config-missing / bad-input / external-API-failure by the error message.
- Adding a job means updating the app README's job list and env vars.
