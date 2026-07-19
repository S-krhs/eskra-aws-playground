# SQS Integration

AWS SQS への message 送信境界を担当する integration package です。

## Public API

- `src/sqs-message-sender.ts`
  - `SqsMessageSender`: 指定した queue URL へ message を batch 送信するクライアント。
  - `SqsMessageInput`: 送信する message の最小入力。

## 責務

- AWS SDK を使った SQS `SendMessageBatch` の呼び出しと batch 分割（最大 10 件）を扱う。
- 送信失敗（`Failed`）を、失敗した message id を含むエラーへ変換する。
- queue URL の解決、message body の業務形式、ジョブ判定は扱わない。
