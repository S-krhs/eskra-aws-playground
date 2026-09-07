---
name: batch-anime-analysis
description: Rules for batch-anime-analysis — scraping, notifications, and BigQuery export for anime metrics. Touch this when editing apps/batch-anime-analysis/** or repositories/anime/**.
---

Runs the anime-scraping definitions from `repositories`, notifies Discord Webhook with results. An orchestrator Lambda enqueues one SQS message per data source; a worker Lambda processes them. A notifier Lambda, triggered by CloudWatch alarm via SNS, handles batch-failure notification. A schedule-triggered Lambda exports accumulated metrics to BigQuery daily.

## Layers

| Layer | Owns | Doesn't own |
| --- | --- | --- |
| `src/handlers/orchestrator.ts` | orchestrator entry point, delegation to the enqueue job | SQS message processing, scraping detail |
| `src/handlers/sqs-worker.ts` | entry point delegating an SQS event to the data-source scraping job | SQS message body interpretation, scraping detail |
| `src/handlers/bigquery-export.ts` | export entry point, delegation to the export job | deciding the export date range, reading metrics, BigQuery API detail |
| `src/handlers/alarm-notifier.ts` | entry point delegating a CloudWatch-alarm SNS event to the alert job, swallowing notification failures | building the notification text, resolving the webhook URL, send detail |
| `src/jobs/` | run-level orchestration, SQS enqueue, per-record execution control for the worker, alert-message assembly, per-date BigQuery export control, calling repository/feature/integration, building responses | feature-level value transforms, selector interpretation, browser-operation detail, DB connection/SQL detail |
| `src/jobs/runtime-settings/` | per-job runtime-settings types, resolved from SST links/env (queue URL, webhook URL, service-account key, dataset name) | individual feature values, event/response/message types/contracts, talking to an external service |
| `src/features/notifications/` | Discord notification text for scraping results and alerts, its display-input types | HTTP transport, running the scrape, SNS event interpretation |
| `src/features/bigquery-export/` | resolving the export date range, target table structure/identifiers, converting a metric row to a BigQuery row | reading metrics, calling the BigQuery API, validating the launch event |
| `src/features/scrape-api/` / `src/features/scrape-webpage/` | JSON→metric (`scrape-api`), HTML→metric (`scrape-webpage`) | persisting metrics, notification text |
| `src/shared/intermediate-models/` | metric intermediate representation used internally (not for external consumers) | SQS send/receive, scraping, notification text |
| `src/shared/schemas/` | per-handler launch-event validation schema + response type (`lambda/<handler>/`), SQS message-body validation schema (`sqs/<message>/`) | runtime-settings resolution, loading repository definitions |
| `src/shared/routes/` | the one place listing batch names used inside this app (`batch-names.ts`) | job implementation, event interpretation |
| `repositories/anime/` | anime-metric scraping definitions, loading/validating them, persisting/reading anime data by scrape date, hiding DB connection and row shape | Lambda event interpretation, raw-data fetching, resolving webhook URL, notification text, Playwright operation detail |

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
- Persist metrics through the repository API (`saveScrapingResult`) after fetching and before the Discord notification; a record that fails to save reports as a `batchItemFailure` for SQS retry.
- SQS is Standard (no ordering guarantee); retry/DLQ handling is left to AWS. SQS message body construction/validation is centralized in `src/shared/schemas/sqs/data-source/message.ts`; sending goes through `@eskra-aws-playground/integration-sqs`.
- Per-record execution control and partial-batch response live in the data-source scraping job; the worker handler only delegates.
- Alert notification text lives in `src/features/notifications/alarm-report.ts`; assembling the send is `src/jobs/alarm-notification.ts`. A notification-send failure is logged and swallowed in the handler, so it doesn't trigger an SNS retry.
- BigQuery export replaces one scrape-date partition at a time, so re-running a range doesn't change the result. A launch with no range specified targets the previous JST day.
- BigQuery export streams through the repository's keyset pagination rather than reading millions of rows at once. Log completion per scrape date so a run that exceeds Lambda's execution time can resume from where it left off.
- Leave one line of orchestration comment per processing section.
- Keep `details` and logs to safe, debugging-relevant info; distinguish config-missing / bad-input / external-API-failure by the error message.
- Adding a job means updating the app README's job list and env vars.
