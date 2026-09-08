# Eskra AWS Playground

AWS Lambda と SST でバッチジョブを運用する TypeScript モノレポです。

## コマンド

- `npm run dev`（personal stage への `sst dev`。ローカル実行はこれに統合）
- `npm run db:generate`（Prisma Client / Zod schema の再生成。`postinstall` でも実行）
- `npm run db:migrate:dev`（migration の作成とローカル用 Neon branch への適用）
- `npm run db:migrate`（commit 済み migration の適用。CD が実行）
- `npm run typecheck`
- `npm run typecheck:capped`（型チェックを cgroup で 6GB に制限して実行。型が爆発したときに WSL ごと巻き込まれるのを防ぐ。TypeScript 7 の型チェッカは Go のネイティブバイナリなので `--max-old-space-size` は効かない）
- `npm run lint`
- `npm run format`
- `npm run format:fix`
- `npm run validate`
- `npm run build`
- `npm run deploy`

## デプロイ

`.github/workflows/deploy.yml` が `main` ブランチへの push で SST app をデプロイします。手順は [docs/ci-cd.md](docs/ci-cd.md)。
