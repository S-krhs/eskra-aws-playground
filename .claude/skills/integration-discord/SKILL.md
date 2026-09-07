---
name: integration-discord
description: Rules for the Discord integration package — outbound API calls and inbound interaction parsing. Touch this when editing packages/integrations/discord/**.
---

Discord API boundary, both directions: outbound calls to Discord and inbound parsing of interaction requests.

## Public API

Outbound clients (real network calls): `discord-webhook-client.ts`, `discord-bot-client.ts` (channel messages, global/guild command list + bulk overwrite), `discord-interaction-client.ts` (edit/follow-up on a deferred interaction).

Inbound protocol (wire logic/types, no network): `parse-interaction.ts`, `parse-interaction-callback.ts` (pulls `application_id`/`token` for deferred responses), `verify-interaction-signature.ts` (Ed25519), `interaction-response.ts` (callback payload types/consts), `discord-interaction.ts` (parsed interaction model).

## Rules

- Scope: Discord-specific payload types, HTTP transport, signature verification, interaction wire parsing, error translation for failed responses.
- **Don't interpret the custom_id convention (`prefix:target:action`) here.** `parse-interaction` returns the raw custom_id string; that convention belongs to `shared-domains`'s custom-id codec.
- Don't resolve webhook URL/token/public key, generate business copy, or judge application-specific command names here — caller's job.
- Never import `shared-domains` or `apps/*` — this is the innermost transport boundary.
- Verify a webhook URL actually points at Discord's HTTPS webhook API.
- Never put a secret in a log or error. Strip the webhook URL and interaction token out of a failure response body before it goes into an error.
- Translate external API failures into an error class the caller can distinguish on (e.g. `DiscordWebhookError`).
- Outbound operations are client classes holding auth/transport config, taking a pre-built payload. Inbound parsing/verification are dependency-free pure functions.
- Internal HTTP helpers (`src/internal/` fetch-json / send-json) aren't public API. Boundary type/interface exports are fine.
