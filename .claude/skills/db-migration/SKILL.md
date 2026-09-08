---
name: db-migration
description: How a schema change is made here — Prisma migrations, forward-only, and what must never go in one. Invoke this when changing the DB schema, migration/**, prisma.config.ts, or repositories/client/**.
---

Commands and connection strings: `migration/README.md`.

- All schema/table changes go through a Prisma migration, `CREATE SCHEMA` included — never edit via the Neon console (read-only).
- Migrations are forward-only. To undo something, write a new migration that reverses it, don't roll back.
- Don't put data backfills in a migration. A one-time import goes in a runbook doc; anything recurring becomes a batch app job.
- `DIRECT_DATABASE_URL` is only for migrate commands. In CD it's scoped to the migration step's env, nowhere else.
- A PR with a destructive migration (column drop/rename, type change) must say so in the PR body and needs review approval.
