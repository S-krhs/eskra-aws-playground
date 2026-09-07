---
name: libs
description: Rules for the generic, app/domain-independent libs packages. Touch this when editing packages/libs/**.
---

App/domain-independent generic logic. Split by dependency weight: `utils` (pure, light npm deps only) vs `browser` (Playwright-core, other browser-execution deps).

- Split directories by concern (`gacha`, `string`, `date`, ...). Something needing a heavy dependency like browser execution goes to its own package, not mixed into `utils`.
- Don't pile type, validation, algorithm, and public API into one file — split by concern once there's more than one.
- A file's header comment describes only that file's own responsibility, not the whole module.
- If app or integration concerns start leaking in here, that's a sign to revisit the boundary. Use DI only when there's a concrete complexity win from it.
- A lib whose main job is randomness should take its randomness source as a parameter (`random: () => number`) so it's testable — `Math.random` only shows up as the default at the public-API edge.
