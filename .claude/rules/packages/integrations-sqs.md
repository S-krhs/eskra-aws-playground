---
paths:
  - "packages/integrations/sqs/**"
---

# SQS Integration

AWS SQS への message 送信境界です。公開 API は `src/sqs-message-sender.ts` の `SqsMessageSender` と `SqsMessageInput` に限定します。

- AWS SDK による `SendMessageBatch` の呼び出し、batch 分割(最大 10 件ずつ)、送信失敗のエラー変換に集中する。順序は要求しない。
- queue URL の解決、message body の業務形式、ジョブ判定は行わない。queue URL は呼び出し側が解決して constructor へ渡す。
- 送信結果に `Failed` があれば、失敗した message id を含むエラーを throw する。
