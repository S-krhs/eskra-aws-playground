---
name: integration-r2
description: Rules for the Cloudflare R2 integration package. Touch this when editing packages/integrations/r2/**.
---

Cloudflare R2 transport boundary. Public API limited to `src/r2-client.ts`, `src/r2-object-types.ts`, `src/r2-object-store.ts`.

- Public types live in `r2-object-types.ts`; operations are grouped in `r2ObjectStore` (`r2-object-store.ts`) — same shape as a `repositories` repository, not loose exported functions.
- R2 is S3-compatible: use `@aws-sdk/client-s3`, build the endpoint from the account ID, `region: "auto"`.
- Credentials and bucket name are resolved by the caller and passed in — this package never reads an env var or a config file.
- Client sets `requestChecksumCalculation` and `responseChecksumValidation` to `WHEN_REQUIRED`. The SDK default (`WHEN_SUPPORTED`) sends checksum headers R2 doesn't understand and the request fails — don't leave this at default.
- Never put a key's contents in a log or error; a validation failure names only the field.
- The JSON-string entry point for a secret is `parseR2CredentialsJson`. `JSON.parse`'s `SyntaxError` embeds the start of its input in the message, so parsing the raw secret string at the app layer leaks it into logs (same treatment as `integration-bigquery`'s `parseServiceAccountKey`).
- No key construction, logical-path interpretation, thumbnail generation, or DB writes here — wire-level object ops only.
- ETag is returned with the quotes stripped so callers can compare it directly.
- `CopySource`: keep the key's `/` as path separators, percent-encode everything else — needed for non-ASCII folder names.
- `copy` only sets `MetadataDirective: REPLACE` when metadata is passed; default behavior carries over the source's metadata, which is what keeps a UUID intact across a move.
- A single `CopyObject` tops out at 5GB. Past that, add multipart copy as a separate function.
