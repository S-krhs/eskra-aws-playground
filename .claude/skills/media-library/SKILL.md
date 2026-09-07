---
name: media-library
description: Rules for media-library — the local Hono+React tool for browsing and organizing R2 media. Touch this when editing apps/media-library/**.
---

Local tool, resident on WSL, for browsing and organizing R2 media from a browser. User docs: `apps/media-library/README.md`. Resident-process/PWA setup: `docs/media-library-app.md`.

**Never deployed.** Doesn't appear in `infra/sst.config.ts` — only ever runs on a user's WSL. Sync itself is `batch-playground`'s Lambda; this app just asks it to start and reads progress.

## Layout

```text
backend/src/    Hono. One process serves both the API and the UI.
frontend/src/   React, built with Vite; backend serves the build output.
```

- **Backend's relative imports don't use the `@/` alias.** Other apps have a bundler resolving paths; this backend runs as `node backend/dist/server.js` directly, so `tsconfig`'s `paths` never gets resolved at runtime.
- Frontend uses `@/` (its own `src`) and `@backend/` (backend's `src`, types only) — register both in Vite's and vitest's alias config.
- Frontend never hand-writes response types — derive them from the backend's route definitions via `hc<ApiType>()` and `InferResponseType`. Never import backend values into frontend, types only.

## Frontend layout (Feature-Sliced Design)

`frontend/src/` is split into FSD layers. It's a single-screen SPA with no router, so screen assembly lives in `pages/media-library` and `app/` only bootstraps React.

```text
app/main.tsx                          React bootstrap + style import
pages/media-library/                  screen assembly (ui)
features/media-filter/                filter controls (ui)
features/media-grid/                  list fetching + virtual scroll (ui, model)
features/sync-control/                sync trigger + progress (ui, model)
entities/media/                       MediaFilter (model)
shared/api/                           backend API client
shared/lib/                           formatting
shared/styles/index.css               Tailwind entry point
```

- A slice splits into `ui/` (rendering), `model/` (business-relevant types/data/hooks), `lib/` (business-agnostic transforms) — only the segments actually needed.
- Imports flow one direction: `app → pages → features → entities → shared`. Never back up, and never sideways between slices at the same layer.
- **A type used by more than one feature moves to entities.** The filter condition is used by both the filter feature and the grid feature, so it lives in `entities/media` — skipping this turns into a feature-to-feature import.
- **Don't build layers top-down.** Add one only once something actually needs to be shared at that level. There's no `widgets` layer yet — add it only once something spans multiple screens.
- A slice and each `shared` segment has an `index.ts` as its public API — the only thing imported from outside (`@/features/media-grid`, `@/shared/api`). This is this app's exception to the repo-wide no-barrel-file rule.
- Inside a slice, use relative imports (`../model/use-media-page.js`); only cross a slice boundary via its `index.ts` alias. The import itself should say whether you're inside or outside the slice.
- Import a `.ts`/`.tsx` file by name with a `.js` extension; only a public-API import skips the extension (resolves to the directory's `index.ts`).

## Lint

`npm run lint` runs `biome ci .` then `steiger ./frontend/src`. An FSD violation fails CI.

- steiger's config is `steiger.config.js` — a `.ts` config breaks, because cosmiconfig's TypeScript loader doesn't support this repo's TypeScript 7.
- `fsd/insignificant-slice` is off for the whole app. With one screen, every slice has exactly one reference and gets flagged. Scoping the rule via `files` doesn't help — files outside that scope stop counting as references, so even `entities/media` looks like "one reference." **Once a second screen exists, remove this override and confirm the warnings actually go away.**
- Nothing else is disabled. `fsd/forbidden-imports` (cross-layer violations), `fsd/no-public-api-sidestep`, and `fsd/public-api` (missing public API) stay on.
- Tailwind class order uses `biome.json`'s `useSortedClasses` override (same as `static-site-playground`). It's an unsafe fix, so `biome check --write` won't touch it — use `biome check --write --unsafe apps/media-library/frontend/src`.

## Rules

- API routes live under `/api`; everything else falls through to `index.html` — without that namespace split they'd collide with the screen's own routes.
- Validate input inside the route with zod's `safeParse`, fail with 400. An error message names only the field, never the value that was passed.
- Never put credentials, connection strings, or an R2 key in a response. The list endpoint returns only `MediaView` fields — no `objectKey`, no `thumbnailKey`.
- Exception detail stays in the local log via `onError`; the response is a fixed generic message.
- Config comes from `~/.config/eskra-media-library/config.json`. Its location is decided in `shared-domains`'s `media-library-config`, shared with the uploader.
- `repositories` reads its connection from `DATABASE_URL` — set it in `server.ts` before any route runs.
- **Connection settings and clients live at module scope, read through a getter.** Don't turn a route into a factory taking a context object. Same shape as `repositories/db/client.ts`'s `getPrismaClient`: settings via `getLibrarySettings`, R2 client via `getR2Client`. A route is exported as a `new Hono()` value; `app.ts` wires it in with `.route()`.
- Sync starts via an async Lambda invoke and doesn't wait for completion. Double-start protection is the sync job's job (it checks its own running record) — this app doesn't guard against it.
- Thumbnails get cached locally. Write to a temp name and rename into place, so a request mid-write never reads a partial file.
- A thumbnail's id becomes its filename directly — validate it as a UUID before it touches R2 or the DB.
- Bind to `127.0.0.1` only — don't open this up to other devices without an explicit decision to.
- If the port is already taken, assume another instance is running and exit 0. A resident restart should never end up running two instances.

## Layers

| Layer | Owns | Doesn't own |
| --- | --- | --- |
| `backend/src/server.ts` | loading config, creating clients, starting the listener, handling startup failure | route implementation, business logic |
| `backend/src/app.ts` | composing routes, serving static files, the shared error response | individual route implementation, DB/R2 calls |
| `backend/src/routes/` | HTTP in/out, input validation, calling repository/integration | file operations, external-service wire detail |
| `backend/src/routes/intermediate-models/` | response types, converting from repository types | DB queries, HTTP status decisions |
| `backend/src/features/<concern>/` | logic pulled out of a route (cache, Lambda invoke) | HTTP interpretation, response assembly |
| `backend/src/shared/` | config loading, process-lifetime client creation | business logic, route implementation |
| `frontend/src/app/` | React bootstrap, global style import | screen implementation, feature implementation |
| `frontend/src/pages/` | screen assembly and its state | feature implementation, API calls |
| `frontend/src/features/<concern>/` | feature-level hooks and display | screen assembly, another feature's implementation |
| `frontend/src/entities/` | types used by more than one feature | a type only one feature uses |
| `frontend/src/shared/` | API client, formatting | screen state, feature-specific logic |
