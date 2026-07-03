# Batch Playground

Lambda イベントの `job` に応じてバッチジョブを実行する app です。

## 実行できるジョブ

### `uma-one-draw-topic`

UMA ワンドロのお題を生成し、Discord Webhook へ通知します。

```json
{
  "job": "uma-one-draw-topic"
}
```

- `job` は必須です。
- Discord Webhook URL はイベントに含めず、SST linked secret またはローカル環境変数から解決します。

## 環境変数

デプロイ時に GitHub Actions secret から SST secret として渡します。

- GitHub Actions secret: `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL`
- SST secret env: `SST_SECRET_UmaOneDrawTopicDiscordWebhook`

ローカル実行用 Discord Webhook:

- `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL`
- `DEFAULT_DISCORD_WEBHOOK_URL`

ローカル実行:

- `BATCH_JOB`

例:

```bash
DEFAULT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/fallback/yyy
BATCH_JOB=uma-one-draw-topic
```

## ローカル実行

1. `apps/batch-playground/.env.example` を `apps/batch-playground/.env` にコピーします。
2. `npm install`
3. `npm run local:batch-playground`

## ドキュメント

- アーキテクチャ: [docs/architecture.md](docs/architecture.md)
- 実装ルール: [docs/implementation-rules.md](docs/implementation-rules.md)
