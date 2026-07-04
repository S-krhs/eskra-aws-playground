# Batch Anime Analysis

アニメ関連のランキングや指標をスクレイピングし、結果を Discord Webhook へ通知する app です。

Supabase 接続、DB 登録はまだ行いません。SQS キューイングは Orchestrator Lambda と Worker Lambda に分け、dataSource 単位で再実行できる構成にしています。

## 実行できるジョブ

### `anime-scraping-orchestrator`

`repositories/anime/data.ts` にあるスクレイピング定義から対象を選び、dataSource 単位の実行要求を SQS に投入します。

```json
{
  "dataSourceIds": ["my-anime-list-top-anime-score"],
  "requestedBy": "manual-rerun",
  "reason": "rerun"
}
```

- `dataSourceIds` を省略すると全 dataSource を投入します。
- `runId` を省略すると orchestrator 実行時刻の ISO 文字列を使います。
- SQS は Standard Queue です。順序は保証せず、再試行と DLQ は SQS に委譲します。

### `anime-scraping-data-source`

SQS message で指定された dataSource のスクレイピング定義を実行し、取得結果を Discord Webhook へ通知します。

```json
{
  "job": "anime-scraping-data-source",
  "runId": "2026-07-04T00:00:00.000Z",
  "dataSourceId": "my-anime-list-top-anime-score",
  "requestedBy": "orchestrator"
}
```

- 通常は orchestrator が SQS に投入します。
- `dataSourceId` は `repositories/anime/data.ts` の `id` を指定します。
- `source.type` は `api` と `webpage` に対応します。Chromium 起動と HTML 取得は `packages/libs/browser` が扱います。

## 環境変数

ローカル実行用 Discord Webhook:

- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`
- `DEFAULT_DISCORD_WEBHOOK_URL`

ローカル orchestrator 用 SQS Queue URL:

- `ANIME_ANALYSIS_QUEUE_URL`

ローカル実行:

- `BATCH_DATA_SOURCE_IDS`
- `BATCH_RUN_ID`
- `BATCH_REQUESTED_BY`
- `BATCH_TARGET_DATE`
- `BATCH_REASON`

## ローカル実行

1. `apps/batch-anime-analysis/.env.example` を `apps/batch-anime-analysis/.env` にコピーします。
2. `npm install`
3. `npm run local:batch-anime-analysis`

## デプロイ

`infra/sst.config.ts` は次の AWS リソースを作成します。

- Orchestrator Lambda
- Worker Lambda
- SQS Queue / DLQ
- Orchestrator を毎日 JST 09:00 に起動する EventBridge Scheduler

GitHub Actions からのデプロイには次の Secret が必要です。

- `ANIME_ANALYSIS_DISCORD_WEBHOOK_URL`

## ドキュメント

- アーキテクチャ: [docs/architecture.md](docs/architecture.md)
- 実装ルール: [docs/implementation-rules.md](docs/implementation-rules.md)
