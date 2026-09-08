---
name: api
description: How an HTTP endpoint is built here — route/operation layering, request validation, what may leave in a response, deferring slow work to a queue. Invoke this whenever adding or editing anything serving HTTP, in an existing app or a new one.
---

Covers anything serving HTTP, whatever the runtime — a Lambda Function URL routing raw events by path, a Hono server, whatever comes next.

## Layering

```text
handler / server        entry point: routing, signature or auth check, error handling
routes/_shared/         what every route in this app shares (the error response, and so on)
routes/<route>/         one route's dispatch. No business logic.
  contracts/            the public paths and commands this route exposes
  schema.ts             this route's request validation, or its OpenAPI route definitions
  operations/           one operation per file, one method each
  intermediate-models/  the shapes the route layer passes around
features/<feature>/     logic that's more than an operation, or needs an external dependency
```

A route's directory is named after its path in kebab-case, and an operation's file is named after what
it does rather than its method (`list-media-operation.ts`, not `get-operation.ts`).

- A route dispatches; it never reaches into a repository or an integration itself. Direction is always `route -> operation` (or `route -> feature`).
- Don't add a thin operation that only returns a constant — inline it into the route's dispatch.
- `intermediate-models/` holds a type the route layer passes around: an operation's result, the display shape a listing returns, a validation failure turned into a message. It is neither the wire type nor the DB row.

## Rules

- A public path is declared in `contracts/` and registered in the entry point's route table. An unmatched path is 404.
- Validate every request body and query at the route boundary with a zod schema and fail with 4xx. **The error message names only the field, never the value that was passed.**
- When a browser client is generated from this API, the request and response schemas live in `shared-domains` and the route is declared from them, so one definition drives validation, the OpenAPI document and the generated client. A cross-field rule OpenAPI can't state is checked in the route, next to the schema that couldn't say it.
- Verify the caller before doing any work when the endpoint is public — reject with 401 rather than falling through.
- Never put credentials, connection strings, storage keys, or an internal id in a response. Return an explicit view type listing what's allowed out, not a passthrough of the internal shape.
- Exception detail stays in the local log; the response body is a fixed generic message.
- **Work that can't finish inside the platform's response deadline is acknowledged and enqueued, never awaited.** The endpoint returns the protocol's "accepted" response and a queue worker in a batch app does the real work and delivers the result. An enqueue failure can't return that "accepted" response — fall back to an immediate error response the caller actually sees.
- Annotate an outbound message with its shared contract type before handing it to the sender. `SqsMessageInput.body` is `unknown`, so a contract mismatch goes uncaught otherwise.
- Connection settings and clients live at module scope behind a getter. Don't turn a route into a factory taking a context object. A route is exported as a value and wired in by the app's route table.
- Namespace API routes under `/api` when the same process also serves a UI, so they can't collide with the UI's own paths.
- Keep `details` and logs to safe, debugging-relevant values; distinguish config-missing / bad-input / external-API-failure by the error message.
- Adding a route means updating the app README's path table and secrets.

A specific endpoint's own logic lives in its operation's file header and comments, not here. Target-specific wire formats, signature verification, and response types come from that target's package under `packages/integrations/` — see the `integrations` skill.
