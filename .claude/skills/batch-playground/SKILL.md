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

## Media library (media-sync job / media-thumbnail job)

Reflects what's in R2 into the DB and generates thumbnails. Design background: `repositories/media/README.md`. Sync is scheduler-triggered → `batch` job; thumbnail generation is SQS-triggered → `sqs-worker` job.

- Sync resolves through the same router as the rest of `batch`, but gets its own Function since 100k upserts don't fit in 60 seconds. Its job name lives in `shared-domains/contracts/media-job-names.ts` (the management tool, `media-library`, invokes it too); `contracts/job-names.ts` re-exports it.
- Thumbnail job's message contract lives in `shared-domains/contracts` (`media-job-names` / `media-thumbnail-message`), received via the union in `sqs-worker/schema.ts`.
- R2 connection settings are resolved inline in the job — read `process.env.MEDIA_BUCKET` and `Resource.R2Credentials.value` directly, pass credentials through `parseR2CredentialsJson`. Match the shape of the other jobs (e.g. `uma-one-draw-topic-scheduler`) — don't add a settings-only feature.
- `ListObjectsV2` doesn't return custom metadata. Match a known key against the listing alone; only call `HeadObject` on an **unknown** key. Never call it on every key.
- An unknown key gets classified by its `media-id` metadata into new / moved / adopted. Only a key with no `media-id` gets a fresh UUID and lands in `_inbox/`.
- A move also shows up as "the old key is missing." Always exclude it from the delete set.
- Scanning excludes `_thumb/` and non-media extensions — adopting a thumbnail as media creates two rows for one file, and adopting a non-media file makes thumbnail generation fail every time and back up the DLQ.
- **Check scale before deleting.** Deleting a row also deletes its tag links, which can't be restored. An empty listing, or too large a fraction deleted at once, is an error instead of a delete. The guard only applies to deletes — inserts and moves always run. A legitimate bulk delete overrides the guard via a manual invoke with `{ "allowBulkDelete": true }`.
- A move is only confirmed once the old key is actually gone. Metadata gets duplicated on copy, so the same `media-id` can briefly sit on two keys — treating that as a move without checking makes `objectKey` flip between the two on every run.
- If the Delete step of an adopt fails, delete the copy to undo it and retry next run. Leaving the original in place produces two UUIDs/rows for the same content.
- Thumbnail keys are derived from the UUID, so a row with an empty `thumbnailKey` doesn't get missed on cleanup.
- An object that vanishes between the listing and `HeadObject` gets skipped — one 404 shouldn't fail the whole sync.
- Object metadata is writable by anyone with bucket access — validate `media-id` as a UUID before it goes into a primary key.
- A same-key replacement only shows up as a changed etag — include etag in the match, and rebuild the thumbnail/dimensions for anything that changed.
- Delete a row's R2 thumbnail before deleting the row — once the row is gone, its thumbnail key can't be found from a scan.
- The threshold for treating a running record as stale is set longer than the Lambda timeout (15 min) — only a run that died without recording its end gets marked stale; a genuinely still-running job shouldn't get flagged.
- ffmpeg/ffprobe live at `/opt/bin` via a layer. Resolve the path at call time (not at module load) so local tests can swap it.
- Thumbnails for both images and video are made with ffmpeg — no sharp.

## Layers

| Layer | Owns | Doesn't own |
| --- | --- | --- |
| `src/handlers/<handler>/handler.ts` | Lambda entry point, launch-event envelope validation, routing key → job resolution/delegation | job-specific parsing, business logic, external-integration detail |
| `src/handlers/batch/contracts/job-names.ts` | the one place listing job names the `batch` handler accepts | job implementation, schedule |
| `src/handlers/batch/jobs/` | batch-job-specific event parsing, calling feature/repository/integration, building the common response | envelope validation, job dispatch, external-API detail |
| `src/handlers/sqs-worker/jobs/` | SQS-job-specific work, building the final message, calling feature/repository/integration | SQS event validation, job dispatch, input validation already done by the producer |
| `src/handlers/<handler>/schema.ts` | that handler's launch-event/context validation schema + response type | job classification, target-specific types |
| `sst-resource-links.d.ts` (package root) | typed `Resource` declarations for linked secrets | runtime value resolution |
| `src/features/<concern>/` | feature-level logic, feature-specific settings (gacha weights, templates, button styles) shareable across handlers | Lambda event interpretation, building a batch response, another feature's implementation |
| `repositories/playground/` | gacha candidates and DB settings shared across apps, their fetch/save/validate | Lambda event interpretation, message generation, external sends, Discord permission checks |

Job contracts crossing a handler tree (job name, message schema) and producer-shared conventions (custom_id, prefixes, choice catalog, button tone) live in `@eskra-aws-playground/shared-domains`. Discord parsing/signature-verification/response types/send clients come from `@eskra-aws-playground/integration-discord`.

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
- Gacha candidates live per-pool in `playground.gacha_entities`, read from a feature via `gachaEntityRepository`. Weights and message templates are feature-side settings.
- Before sharing logic across features, check whether duplication is actually fine. Cross-app contracts/domain data go to `shared-domains` — don't create a within-app `shared/domains` carrying business logic.
- Don't put implementation files directly under `features/` — split by concern. Settings and logic go in separate files (e.g. `topic-settings.ts` vs. `topic-message.ts`).
- Leave one line of orchestration comment per processing section.
- Keep `details` and start/end logs to safe, debugging-relevant values; distinguish config-missing / bad-input / external-API-failure by the error message.
- Adding a job means updating the app README's job list and env vars.
