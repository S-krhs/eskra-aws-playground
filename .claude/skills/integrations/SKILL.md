---
name: integrations
description: How a package that talks to an external service is built here — the transport boundary, what it owns and refuses, client shape, error translation. Invoke this when adding or editing anything under packages/integrations/.
---

One package per external service: heavy transport libs and auth SDKs accumulate per target, so a new service gets its own package rather than a directory inside an existing one. `architecture.md`'s Package policy defines where the boundary sits; this is how a package inside it is written.

## The boundary

A package owns the wire and nothing above it — target-specific types, outbound HTTP and auth, inbound parsing and signature verification, and translating failure responses into an error the caller can branch on.

- **Connection details are always resolved by the caller and passed in**: credentials, endpoints, queue/table/dataset names. A package never reads an env var, a config file, or an SST resource.
- Never import `shared-domains`, `apps/*`, or another integration package. This is the innermost layer.
- A convention this repo invented stays out even when it arrives over this wire. Parse the wire field, hand back the raw value, and let `shared-domains` interpret the format.
- No key construction, no business decisions, no message wording, no DB access.
- Split by concern rather than growing one file: credential parsing, client construction, and the operations themselves are separate.

## Shape

- An outbound operation is a client class holding auth and transport config, taking a payload the caller already built. Inbound parsing and verification are dependency-free pure functions.
- Group the operations against one resource into a single object — the same shape a `repositories` repository has — instead of exporting loose functions.
- The public API is named explicitly in the package's exports. Internal HTTP helpers live under `src/internal/` and stay unexported; exporting a boundary type or interface is fine.
- Translate an external failure into the package's own error class, so a caller can tell it apart from a bug on our side.

## Working against someone else's service

- **Verify an SDK's defaults instead of assuming them.** A service advertising compatibility with another one still rejects things the SDK sends by default. Set the option explicitly and say why in a comment.
- Validate that a URL or endpoint actually points at the intended service before sending anything to it.
- An error thrown while parsing a secret usually embeds the input in its message. Catch it and throw your own, or the secret lands in the caller's logs.
- A platform's limits — a batch-size cap, a token lifetime, a maximum object size, an expiration that deletes data behind you — are constraints the caller has to design around. Write each one at the code that hits it, so it can't drift away from the call it constrains.
