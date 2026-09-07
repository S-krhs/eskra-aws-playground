---
name: repositories
description: Rules for the repositories workspace — the shared data-access boundary. Touch this when editing repositories/**.
---

Design/DB details: `repositories/README.md`. Before adding anything, look at a sibling repository (e.g. `repositories/media/`) and match its file split and shape rather than inventing a new one.

- Never expose the DB client, connection string, raw SQL, or table-row shapes to an app. `db/` and `generated/` are excluded from `package.json` exports on purpose — a broken import there is the boundary doing its job, not a bug to route around.
- Runtime reads only `DATABASE_URL` (pooled). Don't take a dependency on SST or an app-side resolver here.
- JSONB columns get validated both on write and on read, with a Zod schema local to that repository. Generated Prisma types and that schema never leak into the public API (arguments/return values).
- A repository with its own public types/schema/DB ops gets `types.ts` / `schema.ts` / `repository.ts`, with integration tests in `repository.integration.test.ts` next to it. Don't create an empty file just to keep the shape uniform when there's nothing to put in it.
- No execution logic, parsers, notification sending, or Lambda event parsing here — that's app-side.
