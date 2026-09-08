---
name: function-url-playground
description: Rules for function-url-playground — the public Lambda Function URL endpoint that receives Discord interactions. Touch this when editing apps/function-url-playground/**.
---

Public endpoint for Discord interactions, served by a single Lambda Function URL (`FunctionUrlFunction`, `url: true` in `infra/sst.config.ts`). One handler (`src/handlers/handler.ts`) routes by `rawPath` to a per-bot route. No DB/repositories access — real work goes through SQS to `batch-playground`'s `sqs-worker`.

## Interaction response shape

Discord requires a response inside 3 seconds, so nothing here builds a final response — it deferred-ACKs and hands the real work to SQS.

- Application command → deferred message (type 5, add `flags` only for ephemeral). Message component → deferred update (type 6).
- PING and autocomplete don't have a deferred type — answer them immediately. An input-validation failure with no DB/network involved can also be answered immediately.
- Never build/send the final message here — `sqs-worker` (in `batch-playground`) edits the original message using the interaction token.
- Interaction tokens expire in 15 minutes; keep the follow-up job's retry window inside that.

Each file's own header states its scope — read it before assuming. `src/scripts/` runs ops scripts via `sst shell` (`sync-discord-commands.ts`), not from Lambda; `sst-resource-links.d.ts` at the package root types the linked `Resource` secrets. Discord parsing/verification/response types come from `@eskra-aws-playground/integration-discord`; custom_id conventions, interaction job names/message schemas shared with the producer live in `@eskra-aws-playground/shared-domains`; follow-up enqueue uses `@eskra-aws-playground/integration-sqs`.

## Dependency direction

```text
handler -> routes -> operations -> integration-discord / integration-sqs / shared-domains
routes -> integration-discord (signature verification, response types)
routes -> shared-domains (custom_id codec, prefixes)
```

- A route never calls a feature directly — this app has no `features/`; an operation composes integrations and shared-domains. Dependency direction is always `route -> operation`.
- No dependency on DB/repositories. Anything needing the DB gets enqueued for `sqs-worker` instead.

## Rules

- Add a public path to `contracts/paths.ts` and register it in `handler.ts`'s `routesByPath`. An unmatched path returns 404.
- Verify the Ed25519 signature with the application's public key (integration-discord's `verify-interaction-signature`) — 401 on failure. Public key comes from `Resource.<Bot>DiscordInteractionPublicKey.value`.
- Parse the interaction body with integration-discord's `parse-interaction` / `parse-interaction-callback`. custom_id arrives as a raw string; `shared-domains`'s `parseCustomId` interprets the `prefix:target:action` convention.
- One file per operation, `routes/<route>/operations/<operation>-operation.ts`, one method each. Don't add a thin operation that just returns a constant — inline it into the route dispatch instead.
- When enqueuing from an operation, declare the message as an `InteractionJobMessage` (shared-domains) before handing it to `SqsMessageSender` — `SqsMessageInput.body` is `unknown`, so without that annotation a contract mismatch won't be caught. The message carries the interaction token, so keep it out of logs and `details`.
- An enqueue failure can't return a deferred response — fall back to an immediate ephemeral response instead.
- Adding/changing a slash command means updating that route's `contracts/commands.ts`. Global-scope sync happens via `sync-discord-commands.ts` (root `npm run discord:sync` / `discord:sync:dry`).
- Read a linked secret directly as `Resource.<name>.value`, with the type declared in `sst-resource-links.d.ts`.
- Keep `details` and start/end logs to safe, debugging-relevant values; distinguish config-missing / bad-input / external-API-failure by the error message.
- Adding a bot/route means updating the app README's path table and secrets.
