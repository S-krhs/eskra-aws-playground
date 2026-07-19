# Packages Integrations

外部サービスとの通信境界を、接続先ごとに package として置く領域です。

## Package

- [discord](discord/README.md): Discord API との通信境界（Webhook / Bot / Command の 3 クライアント）。
- [scheduler](scheduler/README.md): EventBridge Scheduler への one-time schedule 登録境界。
- [sqs](sqs/README.md): AWS SQS への message 送信境界。

置くもの・置かないものの基準は [.claude/rules/architecture.md](../../.claude/rules/architecture.md) の Package 方針を参照してください。
