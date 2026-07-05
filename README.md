# Eskra AWS Playground

AWS Lambda と SST でバッチジョブを運用する TypeScript モノレポです。

## コマンド

- `npm run local:batch-playground`
- `npm run local:batch-anime-analysis`
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

必要な GitHub Actions シークレット:

- `AWS_REGION`
- `AWS_ROLE_ARN`
- `UMA_ONE_DRAW_TOPIC_DISCORD_WEBHOOK_URL`
- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`
- `ALERT_DISCORD_WEBHOOK_URL`

アプリやジョブ固有のシークレットは、各 app の README を参照してください。

## ドキュメント

- アーキテクチャ: [docs/architecture.md](docs/architecture.md)
- 実装ルール: [docs/implementation-rules.md](docs/implementation-rules.md)
- CI/CD: [docs/ci-cd.md](docs/ci-cd.md)
- Batch Playground app: [apps/batch-playground/README.md](apps/batch-playground/README.md)
- Batch Playground architecture: [apps/batch-playground/docs/architecture.md](apps/batch-playground/docs/architecture.md)
- Batch Anime Analysis app: [apps/batch-anime-analysis/README.md](apps/batch-anime-analysis/README.md)
- Batch Anime Analysis architecture: [apps/batch-anime-analysis/docs/architecture.md](apps/batch-anime-analysis/docs/architecture.md)
- Discord integration: [packages/integrations/discord/README.md](packages/integrations/discord/README.md)
- Libs: [packages/libs/README.md](packages/libs/README.md)
- Repositories: [repositories/README.md](repositories/README.md)
