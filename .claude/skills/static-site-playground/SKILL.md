---
name: static-site-playground
description: Rules for static-site-playground — the Astro/FSD static site at sasahara.uk. Touch this when editing apps/static-site-playground/**.
---

Astro app generating the static site at `sasahara.uk`. `astro build` outputs HTML/assets to `dist/`; `infra/sst.config.ts`'s `StaticSitePlayground` (CloudFront + S3) serves it. Unknown paths get the origin's standard error. Delivery setup: `docs/sasahara-uk-site.md`.

## Layers

| Layer | Owns | Doesn't own |
| --- | --- | --- |
| `src/pages/` | Astro routing — file path is the URL. Keep a page a thin shell dropping in one widget | UI implementation, data-fetch implementation |
| `src/features/` | a self-contained feature: state + data + display together | a cut that isn't meant to be reused elsewhere |
| `src/widgets/` | self-contained UI block used on more than one page — add only once needed | something used on a single page |
| `src/entities/` | type/data/display for something more than one feature deals with — add only once needed | a type/data only one feature uses |
| `src/shared/` | business-agnostic reusable parts (UI kit, etc.) | anything specific to one screen/action/target |
| `src/layouts/` | the shared shell around a page (`<html>`/`<head>`/nav) | page-specific content |
| `public/` | static files served as-is, no build step (images) | page/component implementation |
| `astro.config.mjs` | Astro build config | page/component implementation |

## Directory layout (Feature-Sliced Design)

`src/` splits into FSD layers. Astro's routing already owns `src/pages/`, so there's no FSD `pages` layer — a route page just drops in one feature.

```text
src/pages/gamble-rumble/index.astro       route
src/features/gamble-rumble/               the whole tool (model, lib, ui)
src/shared/ui/win-forms/                  Windows-Forms-style UI kit (windows, desktop)
src/shared/styles/index.css               Tailwind entry point
```

- A slice splits into `ui/` (rendering), `model/` (business-relevant types/data/copy), `lib/` (business-agnostic transforms) — only what's needed. Phrasing like "you lost" / "you won" is `model`; number formatting or URL building is `lib`.
- Imports flow one direction only: `pages → widgets → features → entities → shared`. Never sideways between slices at the same layer either.
- **Don't build layers top-down — add one only once something actually gets reused at that level.** An operation used on a single screen stays inside that feature; don't pre-carve out a widget or entity. A widget only exists once it's "a self-contained block on more than one page"; an entity only once it's "something more than one feature deals with."
- A slice has an `index.ts` as its public API — the only thing imported from outside (`@/features/gamble-rumble`). This is this app's exception to the repo-wide no-barrel-file rule.
- Inside a slice, use relative imports (`../model/currency-unit.js`); cross a slice boundary only via its public-API alias (`@/shared/ui/win-forms`). The import itself should say whether you're inside or outside the slice.

## Rules

- `.astro` files skip the `In scope`/`Out of scope` header — frontmatter (the `---`-fenced block) is for script, not a place to create just for a comment. `.ts` files still get the header per the repo-wide rule.
- Every page's `<html>` gets `lang="ja"`.
- Static generation (`output: "static"`) is the baseline — SSR or server execution means reconsidering both the Astro adapter and the deploy target together.
- Check Astro's built-ins (`Astro.glob`, content collections, `astro:assets`) before adding an npm dependency.
- No dependency on another workspace (`packages/*`, `shared-domains`, `repositories`) — separate runtime and build from the Lambda apps; revisit the placement itself once sharing is actually needed.
- After `npm run dev`, always stop it with `npm run dev:stop` (`astro dev stop`). Astro 7's dev server runs as a daemon — killing the parent process leaves `astro.mjs dev --json` running, and the next start fails with `Another astro dev server is already running.`
- No catch-all page for unknown paths. `infra/sst.config.ts`'s `assets.routes: ["/"]` forwards to S3 and returns the origin's standard error — don't add an `errorPage`/`indexPage` fallback.
- Importing a `.ts`/`.tsx` file by name (relative or alias) always gets a `.js` extension — Vite resolves it to `.ts`/`.tsx`. Only a slice's public-API import skips the extension (`@/shared/ui/win-forms`, resolving to its `index.ts`). A `.astro` file is imported as `.astro`.

## React islands

A page whose UI changes with interaction is a `@astrojs/react` island. The page stays `.astro`; only the island hydrates, via `<Component client:load />`.

- An island's state lives in that island's top-level component, via `useState` (currently `features/gamble-rumble/ui/gamble-rumble-desktop.tsx` and the per-window `gamble-rumble.tsx`). Lower components get values/callbacks as props. No state-management library.
- Props from `.astro` to an island get serialized — no functions. Anything wiring window contents to an icon happens on the React side (`ui/gamble-rumble-desktop.tsx`).
- Context is only for the window-arranging container talking to individual windows (`shared/ui/win-forms/window-host.ts`) — threading that through props would make a feature carry window-stacking concerns. Apply the same bar before adding another context.
- Don't represent stacking order by reordering an array. Reordering keyed siblings moves DOM nodes, which drops a click mid-press (a background window's button stops responding to a single click). Keep render order fixed; change only the `z-index` value.
- Don't rely on `onDoubleClick` to trigger an action. The browser's native `dblclick` only fires on exactly 2 clicks — rapid clicking beyond that stops firing it (Chrome counts up to 3 then resets to 1, so 6 rapid clicks only fires it twice). Track click timestamps yourself and fire on a second click within a window, then reset the count.
- Don't represent a minimized window's slot by its index in the minimized-windows array. Restoring one shifts every later index, which makes the taskbar bar visually collapse leftward. Use an array indexed by slot with the window as the value; leave a freed slot `null` and reuse it for the next minimize.
- A page that's purely static display doesn't get an island — plain `.astro`.

## Style

Tailwind CSS; no plain CSS files. `style` attribute is only for a value decided at runtime (a drag position) — Tailwind statically scans class names, so it can't turn a runtime value into a class. Never use it for a fixed look. `.astro`'s scoped style doesn't reach an island's DOM, so style islands via class on the component.

| Where | What goes there |
| --- | --- |
| a component's `className` | essentially all visual styling; a value with no theme token is an arbitrary value (`bg-[#ffe0e0]`) |
| `src/shared/styles/index.css` | Tailwind entry point — just `@import "tailwindcss"` plus the kit imports |
| `src/shared/ui/<kit>/<kit>.css` | the kit's `@theme` tokens and `@utility` — color/type/border its components use |
| a `.css` inside a slice | only what can't be a class (`@keyframes`, etc.) — imported by the component |
| a page's `<style is:global>` | page-wide background/spacing that lands on `body` |

- Don't add a slice-specific color/typeface to `shared`'s `@theme` — write the arbitrary value at the component that uses it.
- Whether/how something displays is the caller's decision; a component renders what it's given. Don't have a component return `null` based on `props` or compare against a threshold — keep thresholds in the one place that decides.
- `@theme` and `@utility` only work inside CSS reachable from the Tailwind entry point, which only reads down to `shared` — don't let it read a higher layer's CSS.
- Don't put a data URI in a background arbitrary value — the generated CSS hits PostCSS's `Unclosed string`, and `astro build` still passes while only the dev server breaks. Put an image in an `img`'s `src` instead.
- Tailwind scans class names as raw text — a class-shaped word in a comment or string still gets picked up and generates CSS for it.
- `:active` also matches a `disabled` element. Adding a pressed-look via the `active:` variant needs a branch that skips it while disabled — a `disabled:` variant alone doesn't stop the pressed look.

## Lint

`npm run lint` runs `biome ci .` then `steiger ./src`. CI's root `npm run lint` calls this via turbo, so an FSD violation fails CI.

### steiger (the official FSD linter)

Checks layers and import direction. Config: `steiger.config.js`.

- Config is `.js` — cosmiconfig's TypeScript loader doesn't support this repo's TypeScript 7, and a `steiger.config.ts` fails with `findConfigFile is not a function`.
- `src/pages/**` is excluded — it's Astro routing, not the FSD `pages` layer, and would otherwise get `index.astro` flagged as that layer's public API.
- `fsd/insignificant-slice` is off only for `src/features/gamble-rumble` — only Astro pages reference this slice, and those are excluded above, so steiger sees zero references. Every other slice keeps the rule on.
- Nothing else is disabled. `index.ts` stays on every slice for `fsd/public-api`; `fsd/forbidden-imports` (cross-layer errors) and `fsd/insignificant-slice` (over-splitting) both stay on.
- Prefer fixing the structure over disabling a rule. An `insignificant-slice` hit usually means "this layer isn't needed yet."

### biome's Tailwind rules

`biome.json` overrides enable `useSortedClasses` and `useTailwindShorthandClasses` only for `apps/static-site-playground/**`. Both are nursery rules, so an upgrade can change what they flag.

`useSortedClasses`'s fix is unsafe, so `biome check --write` skips it — run `biome check --write --unsafe` scoped to `.tsx` files. Including `.astro` strips "unused" imports and breaks the build, so keep the scope narrow.

`noTailwindArbitraryValue` isn't enabled. Turning it on flags 11 intentional arbitrary values that can only go away by moving slice-specific values into `shared`'s `@theme`, which conflicts with the style policy above. Something like `repeating-conic-gradient` doesn't even fit a `@theme` namespace.

### biome, other settings

Biome treats a `.astro` file's frontmatter as a standalone script, so it flags template-only imports and `Props` as unused. `biome.json` turns off `noUnusedImports`/`noUnusedVariables` for `**/*.astro`. CI passes on a warning regardless, but without this off, `biome check --write --unsafe` strips the import and breaks the build.

## Typecheck

`typecheck` is `astro sync && tsc -p tsconfig.json --noEmit`. `astro sync` generates `.astro/types.d.ts`; `tsc` checks `.ts` and `astro.config.mjs`.

Types inside a `.astro` template aren't checked — the official `astro check` depends on Volar, which doesn't support this repo's TypeScript 7 and fails on a `useCaseSensitiveFileNames` reference. A template mistake surfaces at `astro build` instead. Switch to `astro check` once Volar supports TypeScript 7.

## `cookie` dependency

The app's own code never imports `package.json`'s `cookie`. Astro 7 needs `cookie@2`, but the root has `cookie@0.7` hoisted via `prisma-zod-generator` → `express`. Astro's build resolves `cookie` from the app root, so without an app-local `cookie@2`, `parseCookie` can't be found and the build fails. Remove it once the root's `cookie` moves to 2.x.
