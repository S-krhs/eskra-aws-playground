---
name: repositories
description: How data access is written here — the boundary that hides the DB and static data from apps. Invoke this when adding or editing anything under repositories/, a new repository included.
---

Before adding anything, look at a sibling repository and match its file split and shape rather than inventing a new one. Static data and DB coexist inside a repository — the public API hides which one backs it.

- Never expose a client, connection string, raw SQL, bucket name, or table-row shape to an app. `client/` and `generated/` are excluded from `package.json` exports on purpose — a broken import there is the boundary doing its job, not a bug to route around.
- A client resolves its own connection from the environment. An app's job is to have those variables set before the first call, not to build the connection and hand it in.
- Runtime reads only `DATABASE_URL` (pooled). Don't take a dependency on SST or an app-side resolver here.
- **Validate a row against `generated/zod`'s schema before an ordinary insert** — the generator already emits one per table, so a hand-written schema for the same columns is a second copy that drifts from the migration.
- JSONB columns are the exception: no schema can be generated for what a column's payload means, so that one gets a Zod schema local to the repository, applied both on write and on read. Generated Prisma types and either schema never leak into the public API (arguments/return values).
- **Name a method after what it does to the data, never after the caller's feature.** `insert` / `updateCounts` / `findUnfinished`, not `start` / `updateProgress` / `findRunning` — a repository states what rows change, and the same method has to read sensibly to a caller that isn't the one it was written for. The same goes for its input types.
- A repository with its own public types/schema/DB ops gets `types.ts` / `schema.ts` / `repository.ts`, with integration tests in `repository.integration.test.ts` next to it. Don't create an empty file just to keep the shape uniform when there's nothing to put in it.
- What several repositories under one domain share goes in `<domain>/_shared/`, split by what it is: `literals/` for a vocabulary, `formatter/` for turning that vocabulary into the shape the storage actually holds (a key, a path), and `virtual/` for the interfaces mirroring a table's columns, which let a query result be typed without the generated client leaking out.
- **Which of those are public is decided per domain, in `package.json` exports.** `virtual/` is always closed — a row shape reaching an app is exactly what this boundary exists to prevent. A literal is public when a caller names its rows by it (a setting key it passes in) and closed when it describes how the storage is laid out (a key prefix it must never assemble). `formatter/` is always closed, for the same reason.
- **An app never builds a storage key, and never reads one to make a decision.** A method takes what the caller means — which area to put an object in, which media a thumbnail belongs to — and this package works out the key. Handing an app a prefix so it can assemble one puts the storage layout on both sides of the boundary, and the two drift.
- **What the app would have parsed out of a key comes back on the returned value instead** — which area an object sits in, its logical path. Otherwise the app still has to know the key's syntax to act on a listing, and closing off the prefixes achieves nothing.
- **Give a closing-off entry an explicit base rather than a wildcard one** (`./media/_shared/formatter/*.js`, not `./media/*/formatter/*.js`): two patterns whose text before the first `*` is the same length can resolve either way, and the block silently stops working. Check it resolves the way you meant rather than assuming.
- No execution logic, parsers, notification sending, or Lambda event parsing here — that's app-side.
- An integration test that hits a real DB only runs when `TEST_DATABASE_URL` (a local Neon branch) is set.
