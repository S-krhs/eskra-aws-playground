---
name: integrations
description: What each external-service package owns and the platform behavior its callers have to design around (BigQuery, Discord, R2, EventBridge Scheduler, SQS). Invoke this when editing packages/integrations/**, or when writing app code that talks to one of these services.
---

One package per external service, each a thin transport boundary: target-specific types, outbound HTTP/auth, inbound wire parsing, error translation. Connection details (credentials, URLs, dataset/queue/table names) are always resolved by the caller and passed in — never read from an env var or config file inside a package. Never put a secret's contents in a log or error (see `architecture.md`'s Package policy and `coding.md`'s Principles — this applies repo-wide, not just here).

## BigQuery (`bigquery/`)

Public API: `src/service-account-credentials.ts`, `src/bigquery-partition-loader.ts`.

- Scope: running load jobs via `@google-cloud/bigquery`, creating the target table, and wire-parsing the service-account key JSON. Nothing else.
- Writes are `WRITE_TRUNCATE` load jobs replacing one date partition (`<table>$YYYYMMDD`) at a time, so re-running an export doesn't change the result. No streaming inserts.
- Rows come in as an `AsyncIterable` and get written as NDJSON without loading the full set into memory.
- `ensureTable` re-reads metadata after creating the table and errors out if a partition expiration is set. Without that check, rows older than the expiration get silently deleted right after a successful load — the job reports success while the data is gone.

## Discord (`discord/`)

Both directions: outbound calls to Discord and inbound parsing of interaction requests.

- **Don't interpret the custom_id convention (`prefix:target:action`) here.** `parse-interaction` returns the raw custom_id string; that convention belongs to `shared-domains`'s custom-id codec.
- Never import `shared-domains` or `apps/*` — this is the innermost transport boundary.
- Verify a webhook URL actually points at Discord's HTTPS webhook API.
- Translate external API failures into an error class the caller can distinguish on (e.g. `DiscordWebhookError`).
- Outbound operations are client classes holding auth/transport config, taking a pre-built payload. Inbound parsing/verification are dependency-free pure functions.
- Internal HTTP helpers (`src/internal/` fetch-json / send-json) aren't public API. Boundary type/interface exports are fine.

Discord's interaction protocol constrains how a caller is allowed to answer, so it shapes app code too:

- **The endpoint has 3 seconds to respond.** Anything slower answers with a deferred type and delivers the real result later: an application command gets a deferred message (type 5, with `flags` only for ephemeral), a message component gets a deferred update (type 6).
- PING and autocomplete have no deferred type — answer them immediately. So can an input-validation failure that touches no DB or network.
- The follow-up edits the original message using the interaction's own `application_id` and `token`; no bot token is involved. **The token expires in 15 minutes** — keep every retry inside that window.
- Slash command definitions are synced to Discord at global scope by an ops script (root `npm run discord:sync` / `discord:sync:dry`), not at deploy time. Changing a command means updating its definition and running the sync.

## R2 (`r2/`)

Public API: `src/r2-client.ts`, `src/r2-object-types.ts`, `src/r2-object-store.ts`.

- Public types live in `r2-object-types.ts`; operations are grouped in `r2ObjectStore` (`r2-object-store.ts`) — same shape as a `repositories` repository, not loose exported functions.
- R2 is S3-compatible: use `@aws-sdk/client-s3`, build the endpoint from the account ID, `region: "auto"`.
- Client sets `requestChecksumCalculation` and `responseChecksumValidation` to `WHEN_REQUIRED`. The SDK default (`WHEN_SUPPORTED`) sends checksum headers R2 doesn't understand and the request fails — don't leave this at default.
- No key construction, logical-path interpretation, thumbnail generation, or DB writes here — wire-level object ops only.
- ETag is returned with the quotes stripped so callers can compare it directly.
- `CopySource`: keep the key's `/` as path separators, percent-encode everything else — needed for non-ASCII folder names.
- `copy` only sets `MetadataDirective: REPLACE` when metadata is passed; default behavior carries over the source's metadata, which is what keeps a UUID intact across a move.
- A single `CopyObject` tops out at 5GB. Past that, add multipart copy as a separate function.

## Scheduler (`scheduler/`)

One-time-schedule registration. Public API: `src/one-time-schedule-client.ts`'s `OneTimeScheduleClient`, `OneTimeScheduleInput`, `OneTimeScheduleResult`.

- Scope: calling `CreateSchedule` via `@aws-sdk/client-scheduler` and translating `ConflictException`. Nothing else.
- An already-existing schedule with the same name returns `created: false` instead of throwing — idempotent double-registration guard.
- Schedules are one-time, registered with `ActionAfterCompletion: DELETE` so they clean themselves up after running.

## SQS (`sqs/`)

Public API: `src/sqs-message-sender.ts`'s `SqsMessageSender` and `SqsMessageInput`.

- Scope: `SendMessageBatch` calls, splitting into batches of at most 10, translating send failures. No ordering guarantee.
- If the send result has any `Failed` entries, throw an error carrying the failed message ids.
