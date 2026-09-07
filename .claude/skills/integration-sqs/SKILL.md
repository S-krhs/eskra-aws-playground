---
name: integration-sqs
description: Rules for the SQS integration package. Touch this when editing packages/integrations/sqs/**.
---

AWS SQS message-sending boundary. Public API limited to `src/sqs-message-sender.ts`'s `SqsMessageSender` and `SqsMessageInput`.

- Scope: `SendMessageBatch` calls, splitting into batches of at most 10, translating send failures. No ordering guarantee.
- Queue URL resolution, message-body business shape, and job classification aren't this package's job — the caller resolves the queue URL and passes it to the constructor.
- If the send result has any `Failed` entries, throw an error carrying the failed message ids.
