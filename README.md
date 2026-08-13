# Eskra AWS Playground

AWS Lambda と SST でバッチジョブを運用する TypeScript モノレポです。

## コマンド

- `npm run dev`（personal stage への `sst dev`。ローカル実行はこれに統合）
- `npm run db:generate`（Prisma Client / Zod schema の再生成。`postinstall` でも実行）
- `npm run db:migrate:dev`（migration の作成とローカル用 Neon branch への適用）
- `npm run db:migrate`（commit 済み migration の適用。CD が実行）
- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run format:fix`
- `npm run validate`
- `npm run build`
- `npm run deploy`

各コマンドは npm workspaces と Turbo 経由で実行します。

## デプロイ

`.github/workflows/deploy.yml` が `main` ブランチへの push で SST app をデプロイします。
必要な GitHub Actions シークレットと運用手順は [docs/ci-cd.md](docs/ci-cd.md) を参照してください。

## ドキュメント

- 実装ルール: [.claude/rules/](.claude/rules/)（Claude Code が自動読み込み。人間も参照する）
- CI/CD 運用マニュアル: [docs/ci-cd.md](docs/ci-cd.md)
- Batch Playground app: [apps/batch-playground/README.md](apps/batch-playground/README.md)
- Batch Anime Analysis app: [apps/batch-anime-analysis/README.md](apps/batch-anime-analysis/README.md)
- Static Site Playground app: [apps/static-site-playground/README.md](apps/static-site-playground/README.md)
- Integrations: [packages/integrations/README.md](packages/integrations/README.md)
- Libs: [packages/libs/README.md](packages/libs/README.md)
- Repositories: [repositories/README.md](repositories/README.md)
- Migration: [migration/README.md](migration/README.md)
