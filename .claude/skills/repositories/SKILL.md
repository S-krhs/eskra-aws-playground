---
name: repositories
description: How data access is written here — the boundary that hides the DB and static data from apps. Invoke this when adding or editing anything under repositories/, a new repository included.
---

Before adding anything, look at a sibling repository and match its file split and shape rather than inventing a new one. Static data and DB coexist inside a repository — the public API hides which one backs it.

- Never expose a client, connection string, raw SQL, bucket name, or table-row shape to an app. `client/` and `generated/` are excluded from `package.json` exports on purpose — a broken import there is the boundary doing its job, not a bug to route around.
- A client resolves its own connection from the environment. An app's job is to have those variables set before the first call, not to build the connection and hand it in.
- Runtime reads only `DATABASE_URL` (pooled). Don't take a dependency on SST or an app-side resolver here.
- JSONB columns get validated both on write and on read, with a Zod schema local to that repository. Generated Prisma types and that schema never leak into the public API (arguments/return values).
- A repository with its own public types/schema/DB ops gets `types.ts` / `schema.ts` / `repository.ts`, with integration tests in `repository.integration.test.ts` next to it. Don't create an empty file just to keep the shape uniform when there's nothing to put in it.
- No execution logic, parsers, notification sending, or Lambda event parsing here — that's app-side.
- An integration test that hits a real DB only runs when `TEST_DATABASE_URL` (a local Neon branch) is set.
