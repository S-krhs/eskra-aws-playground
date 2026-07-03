# Lambda Batch Playground

Lambda イベントの `job` に応じてバッチジョブを実行する TypeScript モノレポです。

現在は UMA のワンドロのお題を Discord Webhook へ通知する `uma-one-draw-topic` ジョブを登録しています。
`apps/batch-playground` を SST で Lambda と EventBridge Scheduler としてデプロイします。
外部サービス連携は `packages/integrations/*` に分離しています。

## 実行できるジョブ

### `uma-one-draw-topic`

UMA ワンドロのお題を生成し、Discord Webhook へ通知します。

```json
{
  "job": "uma-one-draw-topic"
}
```

- `job` は必須です。
- 未登録の `job` を指定すると `Unknown batch job` エラーになります。

## 環境変数

ローカル実行:

- `BATCH_JOB`

例:

```bash
BATCH_JOB=uma-one-draw-topic
```

## ローカル実行

1. `.env.example` をコピーして `.env` を作成します。
2. `npm install`
3. `npm run local`

## コマンド

- `npm run local`
- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run format:fix`
- `npm run validate`
- `npm run build`
- `npm run deploy`

各コマンドは npm workspaces と Turbo 経由で実行します。

## デプロイ

`.github/workflows/deploy.yml` では、`main` ブランチへの push で SST app をデプロイします。
`infra/sst.config.ts` は `apps/batch-playground/src/lambda-handler.ts` を handler とする Lambda と、UMA ワンドロお題通知用の EventBridge Scheduler を作成します。

必要な GitHub Actions シークレット:

- `AWS_REGION`
- `AWS_ROLE_ARN`

アプリやジョブ固有のシークレットは、各 app の README を参照してください。

## ドキュメント

- アーキテクチャ: [docs/architecture.md](docs/architecture.md)
- 実装ルール: [docs/implementation-rules.md](docs/implementation-rules.md)
- CI/CD: [docs/ci-cd.md](docs/ci-cd.md)
- Batch Playground app: [apps/batch-playground/README.md](apps/batch-playground/README.md)
- Batch Playground architecture: [apps/batch-playground/docs/architecture.md](apps/batch-playground/docs/architecture.md)
- Discord integration: [packages/integrations/discord/docs/architecture.md](packages/integrations/discord/docs/architecture.md)
- Libs: [packages/libs/docs/architecture.md](packages/libs/docs/architecture.md)
