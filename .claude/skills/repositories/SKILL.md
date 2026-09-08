---
name: repositories
description: How data access is written here — the boundary that hides the DB and static data from apps. Invoke this when adding or editing anything under repositories/, a new repository included.
---

Before adding anything, look at a sibling repository and match its file split and shape rather than inventing a new one. Static data and DB coexist inside a repository — the public API hides which one backs it.

- Never expose a client, connection string, raw SQL, bucket name, or table-row shape to an app. `client/` and `generated/` are excluded from `package.json` exports on purpose — a broken import there is the boundary doing its job, not a bug to route around.
- A client resolves its own connection from the environment. An app's job is to have those variables set before the first call, not to build the connection and hand it in.
- Runtime reads only `DATABASE_URL` (pooled). Don't take a dependency on SST or an app-side resolver here.
- JSONB columns get validated both on write and on read, with a Zod schema local to that repository. Generated Prisma types and that schema never leak into the public API (arguments/return values).
- **Name a method after what it does to the data, never after the caller's feature.** `insert` / `updateCounts` / `findUnfinished`, not `start` / `updateProgress` / `findRunning` — a repository states what rows change, and the same method has to read sensibly to a caller that isn't the one it was written for. The same goes for its input types.
- A repository with its own public types/schema/DB ops gets `types.ts` / `schema.ts` / `repository.ts`, with integration tests in `repository.integration.test.ts` next to it. Don't create an empty file just to keep the shape uniform when there's nothing to put in it.
- What several repositories under one domain share goes in `<domain>/_shared/`: `literals/` for the vocabulary the storage itself is laid out by — table names, key prefixes, enum values — and `virtual/` for the interfaces mirroring a table's columns, which let a query result be typed without the generated client leaking out. **`literals/` is public API; `virtual/` is closed off in `package.json` exports**, because a row shape reaching an app is exactly what this boundary exists to prevent.
- A prefix or name an app needs in order to address stored data is this package's contract, not the app's domain vocabulary — it belongs in `_shared/literals/`, the same as a table name does.
- No execution logic, parsers, notification sending, or Lambda event parsing here — that's app-side.
- An integration test that hits a real DB only runs when `TEST_DATABASE_URL` (a local Neon branch) is set.
