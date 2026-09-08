---
name: libs
description: How generic, app- and domain-independent code is packaged here, and how it's split by dependency weight. Invoke this when editing packages/libs/**, or when deciding whether logic belongs there at all.
---

App- and domain-independent generic logic only. The split is by **dependency weight**, not by subject: pure logic with light npm deps in one package, anything needing a heavy runtime dependency in its own.

- Split directories by concern, one subject each. Something needing a heavy dependency gets its own package instead of being mixed into the light one.
- Don't pile type, validation, algorithm, and public API into one file — split once there's more than one of them.
- A file's header describes that file's own responsibility, not the module's.
- **App or integration concerns leaking in means the boundary is wrong**, not that the lib needs another parameter. Move it to that app's `features/` or to `shared-domains` instead.
- Use DI only where there's a concrete win from it. Nondeterminism is the standing exception: randomness and the clock are taken as parameters so the logic is testable, with the real source appearing only as a default at the public-API edge.
