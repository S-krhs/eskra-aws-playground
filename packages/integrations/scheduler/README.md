# Scheduler Integration

EventBridge Scheduler への one-time schedule 登録境界を担当する integration package です。

## Public API

- `src/one-time-schedule-client.ts`
  - `OneTimeScheduleClient`: 実行後に自動削除される one-time schedule を登録するクライアント。
  - `OneTimeScheduleInput`: 登録する schedule の最小入力。
  - `OneTimeScheduleResult`: 登録結果。同名 schedule が既に存在する場合は `created: false`。

## 責務

- AWS SDK を使った EventBridge Scheduler `CreateSchedule` の呼び出しと、`ConflictException` の結果変換を扱う。
- 実行時刻の決定、schedule 名や対象 ARN の解決、Lambda イベント解釈は扱わない（呼び出し側が解決して渡す）。
