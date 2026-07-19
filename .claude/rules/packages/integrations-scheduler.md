---
paths:
  - "packages/integrations/scheduler/**"
---

# Scheduler Integration

EventBridge Scheduler への one-time schedule 登録境界です。公開 API は `src/one-time-schedule-client.ts` の `OneTimeScheduleClient`・`OneTimeScheduleInput`・`OneTimeScheduleResult` に限定します。

- AWS SDK(`@aws-sdk/client-scheduler`)による `CreateSchedule` の呼び出しと、`ConflictException` の結果変換に集中する。
- 実行時刻の決定、schedule 名・group 名・target / role ARN の解決、Lambda イベント解釈は行わない。呼び出し側が解決して渡す。
- 同名 schedule が既に存在する場合は throw せず `created: false` を返す(二重登録の冪等な防止)。
- schedule は `ActionAfterCompletion: DELETE` で実行後に自動削除される one-time 登録とする。
