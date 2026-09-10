# Coding rules

Repo-wide rules. See `architecture.md` for placement and dependency direction.

## Principles

- Small and explicit. No implicit side effects, no premature abstraction.
- Stateless pure logic is a function, not a class.
- TypeScript is `strict`. Narrow external input near where it's used, not everywhere.
- ESM: `.js` extension on relative imports.
- No `index.ts` barrel files — import paths should name the responsibility. Exception: a UI app uses Feature-Sliced Design, where each slice (and each `shared` segment) has an `index.ts` as its public API — see the `frontend` skill.
- A directory that exists only to hold what its sibling directories share is named `_shared/`. The underscore says it is not one of the siblings — it names a place, not an element of the structure. `repositories/media/_shared/` sits beside `media-object/` and `media-storage/`; `routes/_shared/` sits beside each route.
- That is a different thing from a directory whose own name happens to be `shared`. A UI app's FSD `shared` is a layer, a peer of `features` and `entities` — a named element of the methodology, not a place its siblings share. It keeps its name.
- Never put secrets, webhook URLs, or unnecessarily detailed bodies in logs or responses.

## File header

Every implementation file starts with:

```ts
// In scope: <what this file owns>
// Out of scope: <what it explicitly doesn't>
```

Split the file if `In scope` covers more than one substantial concern. The filename and `In scope` should point at the same responsibility.

## Comments

Comments are for you (Claude), not for a human maintainer — write only what you'd actually need on a cold read: non-obvious *why*, a real gotcha, a contract that isn't visible in the signature. Delete anything that restates the code. Match the density of the surrounding file rather than adding a comment per line.

Same bar for doc-comments: skip them when the name and types already say everything (`getPrismaClient`, an obvious getter). Write one when there's a real invariant, a non-obvious return shape, or a public API another workspace imports.

Comments and doc-comments are written in English, together with the rules and skills under `.claude/`. What a person reads at runtime or in a document is Japanese: log lines, error messages, `docs/`, and every `README.md`.

## Adding a dependency

- Reach for a standard API or an existing dependency first.
- Before adding an npm dependency, check its purpose, alternatives, and impact on Lambda bundle size.
- Integration-specific deps go in that `packages/integrations/<target>/package.json`.
- App-specific deps go in that `apps/<app>/package.json`.
- Only repo-wide dev tooling goes in the root `package.json`, with one exception: a package whose
  **types cross a workspace boundary** is declared there too, to pin the single copy every workspace
  resolves. npm gives the root's `node_modules` one version of a name; if a conflicting major elsewhere
  in the tree takes that slot, every workspace nests its own copy and the same type coming from two
  workspaces stops being the same type. `zod` and `@hono/zod-openapi` are there for that reason and no
  other — a schema built with one workspace's `z` is handed to a route definition in another.

## Before you're done

- Does the responsibility fit the package boundaries in `architecture.md`?
- Any dependency pointing the wrong direction?
- Any feature-to-feature import?
- Does exported API have a doc-comment where it actually needs one?
- Did a change affect a workspace's Skill? Update it.
- Did `npm run validate` pass?
