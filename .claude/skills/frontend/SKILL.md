---
name: frontend
description: How browser UI is built here — Feature-Sliced Design layering, React conventions, Tailwind policy, and the Astro/Vite/steiger/biome toolchain. Invoke this whenever adding or editing anything that renders UI, in an existing app or a new one.
---

Every UI app uses Feature-Sliced Design and Tailwind, and differs only in renderer: Astro with static output and React islands, or a React SPA on Vite. Copy an existing app's layout, alias setup, and lint config rather than starting from a framework's defaults.

## Feature-Sliced Design

`src/` splits into FSD layers and imports flow one direction only: `app → pages → widgets → features → entities → shared`. Never back up a layer, and never sideways between slices at the same layer.

- A slice splits into `ui/` (rendering), `model/` (business-relevant types, data, copy, hooks), `lib/` (business-agnostic transforms) — only the segments actually needed. "You lost" / "you won" phrasing is `model`; number formatting or URL building is `lib`.
- **Don't build layers top-down.** Add a layer only once something is actually shared at that level. A widget exists once it's a self-contained block on more than one page; an entity exists once more than one feature deals with it. An `insignificant-slice` warning usually means the layer isn't needed yet — fix the structure before disabling the rule.
- **A type used by more than one feature moves to `entities`.** Skipping this becomes a feature-to-feature import, which is banned repo-wide.
- A slice, and each `shared` segment, has an `index.ts` as its public API — the only thing importable from outside (`@/features/<slice>`, `@/shared/ui/<kit>`). This is the exception to the repo-wide no-barrel-file rule.
- Inside a slice use relative imports; cross a slice boundary only through its public-API alias. The import itself should say whether you're inside or outside the slice.
- Import a `.ts`/`.tsx` file by name with a `.js` extension — the bundler resolves it. Only a public-API import skips the extension, resolving to the directory's `index.ts`. A `.astro` file is imported as `.astro`.
- Which layers exist depends on the renderer. An Astro app has no FSD `pages` layer, because Astro's routing owns `src/pages/`. A single-screen SPA has no router: the screen is assembled in `pages/<screen>` and `app/` only bootstraps React.

## React

- State lives in the top-level component of the tree that owns it — a page, or an island. Lower components receive values and callbacks as props. No state-management library.
- Reach for Context only when threading a value through props would force an unrelated component to carry a cross-cutting concern it has no other reason to know about. Apply that bar before adding another one.
- Whether and how something displays is the caller's decision; a component renders what it's given. Don't have a component return `null` based on `props` or compare against a threshold — keep the threshold in the one place that decides.
- Fetching and subscription live in a hook under the slice's `api/`, not inline in a component. `model/` is for the slice's own types and state.
- **A hook under `api/` hands back where something stands, never the words for it** — a status the caller switches on. Text a person reads is written where it is rendered; a message the backend or the browser worded is passed along as data, and what surrounds it is the UI's to decide.
- **Avoid `useEffect`.** Fetching and polling belong to the query library (`useQuery` / `useInfiniteQuery` / `refetchInterval`); measuring an element goes in a ref callback that returns its own cleanup; reacting to something finishing is expressed by putting the value in the query key rather than watching for the transition. Reach for an effect only when none of those fit, and say why in a comment.
- A UI app takes no runtime dependency on the Lambda-side workspaces (`packages/*`, `shared-domains`, `repositories`) — its runtime and build stay separate. Revisit that placement itself before working around it.
- When the backend is in this repo, never hand-write the client or its response types — generate them from the backend's OpenAPI document into `shared/api/generated/`, and export what the slices need from `shared/api`'s public API under the names the generator gave them — renaming on the way out hides which generated symbol a call actually reaches. The generated directory is excluded from lint and is never edited by hand; regenerate instead.
- An endpoint that returns a file rather than JSON is generated like every other one, even though the screen reaches it through an `<img>`/`<a>` and never calls the fetcher. Keeping it out would take the URL builder with it, leaving the path to be written a second time by hand; take that builder from `shared/api`'s public API and let the fetcher and hook go unused.

## Astro

- The page stays `.astro`; only an interactive component hydrates, as a React island (`<Component client:load />`). A page that's purely static display gets no island.
- Props from `.astro` into an island are serialized — no functions.
- `.astro` files skip the `In scope`/`Out of scope` header: frontmatter is for script, not a block to create just to hold a comment. `.ts` files still get the header per the repo-wide rule.
- Astro owns directories that carry no file header, so their responsibility is only written down here: `src/pages/` is routing (file path is the URL), and a page stays a thin shell dropping in one widget or feature; `src/layouts/` is the shared shell (`<html>`/`<head>`/nav) with nothing page-specific; `public/` is served as-is with no build step; `astro.config.mjs` is build config only.
- Every page's `<html>` gets `lang="ja"`.
- Static generation (`output: "static"`) is the baseline. SSR means reconsidering the adapter and the deploy target together.
- Check Astro's built-ins (content collections, `astro:assets`) before adding an npm dependency.
- A statically deployed site has no catch-all page for unknown paths: the CDN returns the origin's standard error. Don't add an `errorPage`/`indexPage` fallback.
- **After `npm run dev`, always stop it with `npm run dev:stop`.** The dev server runs as a daemon; killing the parent leaves it running and the next start fails with `Another astro dev server is already running.`
- Astro 7 resolves `cookie` from the app root and needs `cookie@2`, while the repo root has `cookie@0.7` hoisted through `prisma-zod-generator` → `express`. The app-local `cookie` dependency exists only for that — remove it once the root's moves to 2.x.

## Style

Tailwind CSS; no plain CSS files. The `style` attribute is only for a value decided at runtime (a drag position) — Tailwind statically scans class names, so it can't turn a runtime value into a class. Never use it for a fixed look.

Nearly all visual styling lives in a component's `className`; a value with no theme token is an arbitrary value (`bg-[#ffe0e0]`). `src/shared/styles/index.css` is only the Tailwind entry point. A UI kit's own `@theme` tokens and `@utility` live in that kit's CSS file. A `.css` file inside a slice holds only what can't be a class (`@keyframes`), imported by the component that needs it. Page-wide background and spacing that lands on `body` goes in that page's `<style is:global>`.

- Don't add a slice-specific color or typeface to `shared`'s `@theme` — write the arbitrary value at the component that uses it.
- `@theme` and `@utility` only work inside CSS reachable from the Tailwind entry point, which only reads down to `shared` — don't let it read a higher layer's CSS.
- A `.astro` scoped style doesn't reach an island's DOM. Style an island through a class on the component.
- Don't put a data URI in a background arbitrary value — the generated CSS hits PostCSS's `Unclosed string`, and the build still passes while only the dev server breaks. Put the image in an `img`'s `src` instead.
- Tailwind scans class names as raw text: a class-shaped word inside a comment or a string still generates CSS.
- `:active` also matches a `disabled` element. A pressed look via the `active:` variant needs a branch that skips it while disabled; a `disabled:` variant alone won't stop it.

## Lint and typecheck

`lint` is `biome ci .` then `steiger` over the FSD root, so an FSD violation fails CI.

- steiger's config must be `steiger.config.js` — cosmiconfig's TypeScript loader doesn't support this repo's TypeScript 7. It sits in the directory holding the FSD root it governs, not at the app root when the app is only partly a frontend; steiger has no `--config` flag and finds it by searching up from the working directory, so the lint script runs from there. Each config's own comments say why its overrides exist; read them before assuming.
- `biome.json` enables `useSortedClasses` and `useTailwindShorthandClasses` only for the UI apps. Both are nursery rules, so an upgrade can change what they flag. `useSortedClasses`'s fix is unsafe: run `biome check --write --unsafe` scoped to `.tsx` files. Including `.astro` strips template-only imports and breaks the build.
- `noTailwindArbitraryValue` stays off. Turning it on flags intentional arbitrary values that could only go away by moving slice-specific values into `shared`'s `@theme`, which contradicts the style policy above.
- Biome reads a `.astro` frontmatter as a standalone script and flags template-only imports and `Props` as unused, so `noUnusedImports`/`noUnusedVariables` are off for `**/*.astro`. Without that, `biome check --write --unsafe` strips the import and breaks the build.
- An Astro app's `typecheck` is `astro sync && tsc --noEmit`, which doesn't check types inside a `.astro` template — `astro check` needs Volar, which doesn't support this repo's TypeScript 7. A template mistake surfaces at `astro build`. Switch once Volar supports it.
