---
name: integration-bigquery
description: Rules for the BigQuery integration package — writing to Google BigQuery. Touch this when editing packages/integrations/bigquery/**.
---

Write boundary to Google BigQuery. Public API is limited to `src/service-account-credentials.ts` and `src/bigquery-partition-loader.ts`.

- Scope: running load jobs via `@google-cloud/bigquery`, creating the target table, and wire-parsing the service-account key JSON. Nothing else.
- The caller resolves the key source, the dataset name, what a row means, and which date range to export — this package just takes the resolved credentials/target in its constructor.
- Writes are `WRITE_TRUNCATE` load jobs replacing one date partition (`<table>$YYYYMMDD`) at a time, so re-running an export doesn't change the result. No streaming inserts.
- Never put the key's contents in an error message or log. A validation failure becomes an error naming only the missing field.
- Rows come in as an `AsyncIterable` and get written as NDJSON without loading the full set into memory.
- `ensureTable` re-reads metadata after creating the table and errors out if a partition expiration is set. Without that check, rows older than the expiration get silently deleted right after a successful load — the job reports success while the data is gone.
