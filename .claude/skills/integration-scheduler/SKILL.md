---
name: integration-scheduler
description: Rules for the EventBridge Scheduler integration package. Touch this when editing packages/integrations/scheduler/**.
---

One-time-schedule registration boundary. Public API limited to `src/one-time-schedule-client.ts`'s `OneTimeScheduleClient`, `OneTimeScheduleInput`, `OneTimeScheduleResult`.

- Scope: calling `CreateSchedule` via `@aws-sdk/client-scheduler` and translating `ConflictException`. Nothing else.
- Execution time, schedule/group name, target/role ARN resolution, and Lambda event parsing are the caller's job — pass them in resolved.
- An already-existing schedule with the same name returns `created: false` instead of throwing — idempotent double-registration guard.
- Schedules are one-time, registered with `ActionAfterCompletion: DELETE` so they clean themselves up after running.
