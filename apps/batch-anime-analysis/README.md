# Batch Anime Analysis

アニメ関連のランキングや指標をスクレイピングし、結果を Discord Webhook へ通知する app です。

Supabase 接続、DB 登録、SQS キューイングはまだ行いません。reference にあった controller / api agent / webpage agent の責務を、後続のオーケストレーションから呼び出せるモジュールとして再構築しています。

## 実行できるジョブ

### `anime-scraping-preview`

`repositories/anime/data.ts` にあるスクレイピング定義を実行し、取得結果を Discord Webhook へ通知します。

```json
{
  "job": "anime-scraping-preview",
  "dataSourceId": "my-anime-list-top-anime-score"
}
```

- `job` は必須です。
- `dataSourceId` は `repositories/anime/data.ts` の `id` を指定します。
- `source.type` は `api` と `webpage` に対応します。Chromium 起動と HTML 取得は `packages/libs/browser` が扱います。

## 環境変数

ローカル実行用 Discord Webhook:

- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`
- `DEFAULT_DISCORD_WEBHOOK_URL`

ローカル実行:

- `BATCH_JOB`
- `BATCH_DATA_SOURCE_ID`

## ローカル実行

1. `apps/batch-anime-analysis/.env.example` を `apps/batch-anime-analysis/.env` にコピーします。
2. `npm install`
3. `npm run local:batch-anime-analysis`

## ドキュメント

- アーキテクチャ: [docs/architecture.md](docs/architecture.md)
- 実装ルール: [docs/implementation-rules.md](docs/implementation-rules.md)
